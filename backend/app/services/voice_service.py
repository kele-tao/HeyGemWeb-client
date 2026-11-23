"""声音业务：上传样本、异步训练、重命名、删除联动。"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings
from ..errors import AppError, RESOURCE_IN_USE, MEDIA_TYPE_UNSUPPORTED, not_found, validation_error
from ..models import Video, Voice
from ..storage import AUDIO_EXTENSIONS, Storage
from ..utils import new_id, utcnow
from . import job_service

VOICE_MIN_DURATION_MS = 30_000
VOICE_MAX_DURATION_MS = 600_000


async def list_voices(
    session: AsyncSession, user_id: str, statuses: list[str], limit: int, offset: int
) -> list[Voice]:
    stmt = (
        select(Voice)
        .where(Voice.user_id == user_id)
        .order_by(Voice.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if statuses:
        stmt = stmt.where(Voice.status.in_(statuses))
    return list((await session.scalars(stmt)).all())


async def get_voice(session: AsyncSession, user_id: str, voice_id: str) -> Voice:
    row = await session.scalar(select(Voice).where(Voice.id == voice_id, Voice.user_id == user_id))
    if row is None:
        raise not_found()
    return row


async def create_voice(
    session: AsyncSession,
    settings: Settings,
    storage: Storage,
    user_id: str,
    name: str,
    upload_file,
    filename: str,
) -> Voice:
    name = (name or "").strip()
    if not name or len(name) > 80:
        raise validation_error("name", "名称需为 1-80 个字符")

    voice_id = new_id()
    rel_dir = Storage.voice_dir(user_id, voice_id)
    dir_path = storage.ensure_dir(rel_dir)

    head = upload_file.file.read(16)
    upload_file.file.seek(0)
    ext = storage.sniff_extension(filename, head)
    if ext not in AUDIO_EXTENSIONS:
        raise AppError(MEDIA_TYPE_UNSUPPORTED)

    tmp = storage.tmp_path(ext)
    size = 0
    with open(tmp, "wb") as out:
        while True:
            chunk = upload_file.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > settings.max_audio_bytes:
                out.close()
                tmp.unlink(missing_ok=True)
                from ..errors import MEDIA_TOO_LARGE

                raise AppError(MEDIA_TOO_LARGE)
            out.write(chunk)

    import os

    try:
        info = storage.validate_media(
            tmp,
            allowed_ext=AUDIO_EXTENSIONS,
            max_bytes=settings.max_audio_bytes,
            min_duration_ms=VOICE_MIN_DURATION_MS,
            max_duration_ms=VOICE_MAX_DURATION_MS,
        )
        target = dir_path / f"sample{ext}"
        os.replace(tmp, target)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)

    row = Voice(
        id=voice_id,
        user_id=user_id,
        name=name,
        status="training",
        sample_rel_path=storage.rel(target),
        duration_ms=info.duration_ms,
        size_bytes=size,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    session.add(row)
    await session.flush()
    await job_service.enqueue_voice_train(session, settings, row)
    return row


async def rename_voice(session: AsyncSession, user_id: str, voice_id: str, name: str) -> Voice:
    row = await get_voice(session, user_id, voice_id)
    name = (name or "").strip()
    if not name or len(name) > 80:
        raise validation_error("name", "名称需为 1-80 个字符")
    row.name = name
    row.updated_at = utcnow()
    return row


async def delete_voice(session: AsyncSession, storage: Storage, user_id: str, voice_id: str) -> str:
    row = await get_voice(session, user_id, voice_id)
    busy = await session.scalar(
        select(Video.id)
        .where(
            Video.user_id == user_id,
            Video.voice_id == voice_id,
            Video.status.in_(("queued", "processing")),
        )
        .limit(1)
    )
    if busy:
        raise AppError(RESOURCE_IN_USE, "有作品正在使用该声音，请等待完成或删除作品")
    await job_service.cancel_active_jobs(session, voice_id=voice_id)
    rel_dir = Storage.voice_dir(user_id, voice_id)
    await session.delete(row)
    await session.flush()
    return rel_dir


async def mark_complete(session: AsyncSession, voice_id: str, asr_rel_path: str, reference_text: str) -> None:
    row = await session.get(Voice, voice_id)
    if row is None:
        return
    row.status = "complete"
    row.asr_rel_path = asr_rel_path
    row.reference_text = reference_text
    row.error_code = None
    row.error_message = None
    row.updated_at = utcnow()


async def mark_failed(session: AsyncSession, voice_id: str, code: str, message: str) -> None:
    row = await session.get(Voice, voice_id)
    if row is None:
        return
    row.status = "failed"
    row.error_code = code
    row.error_message = message
    row.updated_at = utcnow()