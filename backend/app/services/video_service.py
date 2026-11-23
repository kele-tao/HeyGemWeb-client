"""作品业务：提交生成、列表/详情、重命名、删除、重试、分享、批量进度。"""

from __future__ import annotations

import secrets
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings
from ..errors import (
    AppError,
    MEDIA_TOO_LARGE,
    RESOURCE_BUSY,
    invalid_state,
    not_found,
    validation_error,
)
from ..models import Avatar, Job, Video, Voice
from ..storage import AUDIO_EXTENSIONS, Storage
from ..utils import new_id, utcnow
from . import job_service

VIDEO_AUDIO_TYPES = (".wav", ".mp3", ".m4a")
AUDIO_MIN_DURATION_MS = 1_000
AUDIO_MAX_DURATION_MS = 1_800_000
SCRIPT_MAX = 5000


async def list_videos(
    session: AsyncSession,
    user_id: str,
    statuses: list[str],
    q: str | None,
    limit: int,
    offset: int,
) -> list[Video]:
    stmt = (
        select(Video)
        .where(Video.user_id == user_id)
        .order_by(Video.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if statuses:
        stmt = stmt.where(Video.status.in_(statuses))
    if q:
        stmt = stmt.where(Video.title.ilike(f"%{q}%"))
    return list((await session.scalars(stmt)).all())


async def get_video(session: AsyncSession, user_id: str, video_id: str) -> Video:
    row = await session.scalar(select(Video).where(Video.id == video_id, Video.user_id == user_id))
    if row is None:
        raise not_found()
    return row


async def create_video(
    session: AsyncSession,
    settings: Settings,
    storage: Storage,
    user_id: str,
    *,
    title: str,
    avatar_id: str,
    voice_id: str | None,
    script: str | None,
    category: str | None,
    upload_file,
    filename: str,
) -> Video:
    title = (title or "").strip()
    if not title or len(title) > 120:
        raise validation_error("title", "标题需为 1-120 个字符")
    if script and len(script) > SCRIPT_MAX:
        raise validation_error("script", "脚本不能超过 5000 个字符")

    avatar = await session.scalar(
        select(Avatar).where(Avatar.id == avatar_id, Avatar.user_id == user_id)
    )
    if avatar is None:
        raise not_found("数字人不存在")
    if avatar.status != "ready":
        raise invalid_state("数字人尚未就绪，请等待处理完成")

    voice = None
    if voice_id:
        voice = await session.scalar(
            select(Voice).where(Voice.id == voice_id, Voice.user_id == user_id)
        )
        if voice is None:
            raise not_found("声音不存在")
        if voice.status != "complete":
            raise invalid_state("声音尚未就绪，请等待训练完成")

    video_id = new_id()
    rel_dir = Storage.video_dir(user_id, video_id)
    dir_path = storage.ensure_dir(rel_dir)

    head = upload_file.file.read(16)
    upload_file.file.seek(0)
    ext = storage.sniff_extension(filename, head)
    if ext not in VIDEO_AUDIO_TYPES:
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
            if size > settings.max_audio_bytes:
                out.close()
                tmp.unlink(missing_ok=True)
                raise AppError(MEDIA_TOO_LARGE)
            out.write(chunk)

    import os

    try:
        info = storage.validate_media(
            tmp,
            allowed_ext=VIDEO_AUDIO_TYPES,
            max_bytes=settings.max_audio_bytes,
            min_duration_ms=AUDIO_MIN_DURATION_MS,
            max_duration_ms=AUDIO_MAX_DURATION_MS,
        )
        audio_target = dir_path / f"audio{ext}"
        os.replace(tmp, audio_target)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)

    # 作品封面：从数字人封面复制自有副本（数字人删除不影响作品）
    thumb_rel: str | None = None
    if avatar.thumb_rel_path:
        try:
            src = storage.resolve(avatar.thumb_rel_path)
            if src.exists():
                thumb_rel = f"{rel_dir}/thumb.jpg"
                storage.atomic_copy(src, thumb_rel)
        except AppError:
            thumb_rel = None

    row = Video(
        id=video_id,
        user_id=user_id,
        title=title,
        avatar_id=avatar.id,
        voice_id=voice.id if voice else None,
        script=script or None,
        status="queued",
        progress=0,
        thumb_rel_path=thumb_rel,
        audio_rel_path=storage.rel(audio_target),
        duration_ms=None,
        category=(category or None),
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    session.add(row)
    await session.flush()

    await job_service.enqueue_video_synthesize(
        session,
        settings,
        row,
        audio_rel_path=storage.rel(audio_target),
        video_rel_path=avatar.source_rel_path or "",
        ai_task_code=new_id(),
    )
    return row


async def rename_video(session: AsyncSession, user_id: str, video_id: str, title: str) -> Video:
    row = await get_video(session, user_id, video_id)
    title = (title or "").strip()
    if not title or len(title) > 120:
        raise validation_error("title", "标题需为 1-120 个字符")
    row.title = title
    row.updated_at = utcnow()
    return row


async def delete_video(session: AsyncSession, storage: Storage, user_id: str, video_id: str) -> str:
    row = await get_video(session, user_id, video_id)
    rel_dir = Storage.video_dir(user_id, video_id)
    await session.execute(
        Job.__table__.delete().where(Job.video_id == video_id)
    )
    await session.delete(row)
    await session.flush()
    return rel_dir


async def retry_video(
    session: AsyncSession, settings: Settings, user_id: str, video_id: str
) -> Video:
    row = await get_video(session, user_id, video_id)
    if row.status != "failed":
        raise invalid_state("仅失败的作���可以重试")
    if not row.audio_rel_path:
        raise invalid_state("缺少配音音频，无法重试")
    avatar = await session.get(Avatar, row.avatar_id) if row.avatar_id else None
    if avatar is None or avatar.status != "ready":
        raise invalid_state("数字人已删除或不可用，请重新创作")
    row.status = "queued"
    row.progress = 0
    row.error_code = None
    row.error_message = None
    row.completed_at = None
    row.updated_at = utcnow()
    await job_service.enqueue_video_synthesize(
        session,
        settings,
        row,
        audio_rel_path=row.audio_rel_path,
        video_rel_path=avatar.source_rel_path or "",
        ai_task_code=new_id(),
    )
    return row


async def share_video(session: AsyncSession, user_id: str, video_id: str) -> str:
    row = await get_video(session, user_id, video_id)
    if row.status != "success":
        raise invalid_state("仅成功的作品可以分享")
    if not row.share_token:
        row.share_token = secrets.token_urlsafe(32)[:43]
        row.updated_at = utcnow()
    return row.share_token


async def revoke_share(session: AsyncSession, user_id: str, video_id: str) -> None:
    row = await get_video(session, user_id, video_id)
    if row.share_token:
        row.share_token = None
        row.updated_at = utcnow()


async def progress_map(session: AsyncSession, user_id: str, ids: list[str]) -> list[Video]:
    if not ids:
        return []
    stmt = select(Video).where(Video.user_id == user_id, Video.id.in_(ids))
    return list((await session.scalars(stmt)).all())


async def queue_positions(session: AsyncSession, videos: list[Video]) -> dict[str, int]:
    """排队位次：同类型排队中、排序键更早的任务数 + 1（实时计算，不落库）。"""
    results: dict[str, int] = {}
    for video in videos:
        if video.status != "queued":
            continue
        job = await session.scalar(
            select(Job)
            .where(Job.video_id == video.id, Job.status.in_(("queued", "running")))
            .order_by(Job.created_at.desc())
            .limit(1)
        )
        if job is None:
            results[video.id] = 1
            continue
        if job.status == "running":
            continue
        count = await session.scalar(
            select(func.count(Job.id)).where(
                Job.kind == job.kind,
                Job.status == "queued",
                Job.run_after <= job.run_after,
                Job.id != job.id,
            )
        )
        results[video.id] = int(count or 0) + 1
    return results


async def stats(session: AsyncSession, user_id: str) -> dict:
    videos = await session.scalar(select(func.count(Video.id)).where(Video.user_id == user_id)) or 0
    avatars = await session.scalar(select(func.count(Avatar.id)).where(Avatar.user_id == user_id)) or 0
    voices = await session.scalar(select(func.count(Voice.id)).where(Voice.user_id == user_id)) or 0
    success = (
        await session.scalar(
            select(func.count(Video.id)).where(Video.user_id == user_id, Video.status == "success")
        )
        or 0
    )
    finished = (
        await session.scalar(
            select(func.count(Video.id)).where(
                Video.user_id == user_id, Video.status.in_(("success", "failed"))
            )
        )
        or 0
    )
    active = (
        await session.scalar(
            select(func.count(Job.id)).where(
                Job.user_id == user_id, Job.status.in_(("queued", "running"))
            )
        )
        or 0
    )
    return {
        "videos": int(videos),
        "avatars": int(avatars),
        "voices": int(voices),
        "success_rate": round(success / finished, 4) if finished else 0.0,
        "active_tasks": int(active),
    }
