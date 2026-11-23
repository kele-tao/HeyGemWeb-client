"""数字人业务：上传建档、异步抽帧、重命名、删除联动。"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings
from ..errors import AppError, RESOURCE_IN_USE, invalid_state, not_found
from ..models import Avatar, Video
from ..storage import AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, Storage
from ..utils import new_id, utcnow
from . import job_service

AVATAR_MIN_DURATION_MS = 30_000
AVATAR_MAX_DURATION_MS = 600_000


async def list_avatars(
    session: AsyncSession, user_id: str, statuses: list[str], limit: int, offset: int
) -> list[Avatar]:
    stmt = (
        select(Avatar)
        .where(Avatar.user_id == user_id)
        .order_by(Avatar.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if statuses:
        stmt = stmt.where(Avatar.status.in_(statuses))
    return list((await session.scalars(stmt)).all())


async def get_avatar(session: AsyncSession, user_id: str, avatar_id: str) -> Avatar:
    row = await session.scalar(
        select(Avatar).where(Avatar.id == avatar_id, Avatar.user_id == user_id)
    )
    if row is None:
        raise not_found()
    return row


async def create_avatar(
    session: AsyncSession,
    settings: Settings,
    storage: Storage,
    user_id: str,
    name: str,
    upload_file,
    filename: str,
) -> Avatar:
    """体积/格式/时长同步校验 → 落盘 → 写 processing 记录 + 入队 avatar_prepare。"""
    name = (name or "").strip()
    if not name or len(name) > 80:
        from ..errors import validation_error

        raise validation_error("name", "名称需为 1-80 个字符")

    avatar_id = new_id()
    rel_dir = Storage.avatar_dir(user_id, avatar_id)
    dir_path = storage.ensure_dir(rel_dir)

    head = upload_file.file.read(16)
    upload_file.file.seek(0)
    ext = storage.sniff_extension(filename, head)
    if ext not in VIDEO_EXTENSIONS:
        from ..errors import MEDIA_TYPE_UNSUPPORTED

        raise AppError(MEDIA_TYPE_UNSUPPORTED)

    tmp = storage.tmp_path(ext)
    size = 0
    with open(tmp, "wb") as out:
        while True:
            chunk = upload_file.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > settings.max_avatar_bytes:
                out.close()
                tmp.unlink(missing_ok=True)
                from ..errors import MEDIA_TOO_LARGE

                raise AppError(MEDIA_TOO_LARGE)
            out.write(chunk)

    try:
        info = storage.validate_media(
            tmp,
            allowed_ext=VIDEO_EXTENSIONS,
            max_bytes=settings.max_avatar_bytes,
            min_duration_ms=AVATAR_MIN_DURATION_MS,
            max_duration_ms=AVATAR_MAX_DURATION_MS,
            require_video=True,
        )
        target = dir_path / f"source{ext}"
        import os

        os.replace(tmp, target)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)

    row = Avatar(
        id=avatar_id,
        user_id=user_id,
        name=name,
        status="processing",
        source_rel_path=storage.rel(target),
        duration_ms=info.duration_ms,
        width=info.width,
        height=info.height,
        size_bytes=size,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    session.add(row)
    await session.flush()
    await job_service.enqueue_avatar_prepare(session, settings, row)
    return row


async def rename_avatar(
    session: AsyncSession, user_id: str, avatar_id: str, name: str
) -> Avatar:
    row = await get_avatar(session, user_id, avatar_id)
    name = (name or "").strip()
    if not name or len(name) > 80:
        from ..errors import validation_error

        raise validation_error("name", "名称需为 1-80 个字符")
    row.name = name
    row.updated_at = utcnow()
    return row


async def delete_avatar(
    session: AsyncSession, storage: Storage, user_id: str, avatar_id: str
) -> str:
    row = await get_avatar(session, user_id, avatar_id)
    busy = await session.scalar(
        select(Video.id)
        .where(
            Video.user_id == user_id,
            Video.avatar_id == avatar_id,
            Video.status.in_(("queued", "processing")),
        )
        .limit(1)
    )
    if busy:
        raise AppError(RESOURCE_IN_USE, "有作品正在使用该数字人，请等待完成或删除作品")
    # 历史作品 avatar_id 置空（ON DELETE SET NULL），封面是作品自有副本
    rel_dir = Storage.avatar_dir(user_id, avatar_id)
    await session.delete(row)
    await session.flush()
    return rel_dir


async def mark_ready(
    session: AsyncSession, avatar_id: str, thumb_rel_path: str | None, info=None
) -> None:
    row = await session.get(Avatar, avatar_id)
    if row is None:
        return
    row.status = "ready"
    row.thumb_rel_path = thumb_rel_path
    if info is not None:
        row.duration_ms = info.duration_ms or row.duration_ms
        row.width = info.width or row.width
        row.height = info.height or row.height
    row.error_code = None
    row.error_message = None
    row.updated_at = utcnow()


async def mark_failed(session: AsyncSession, avatar_id: str, code: str, message: str) -> None:
    row = await session.get(Avatar, avatar_id)
    if row is None:
        return
    row.status = "failed"
    row.error_code = code
    row.error_message = message
    row.updated_at = utcnow()
