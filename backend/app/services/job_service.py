"""任务入队与状态流转（数据库即队列）。"""

from __future__ import annotations

import json
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings
from ..errors import AppError, RESOURCE_BUSY
from ..models import Avatar, Job, Video, Voice
from ..utils import logger, new_id, utcnow

RESOURCE_FIELD = {
    "avatar_prepare": "avatar_id",
    "voice_train": "voice_id",
    "video_synthesize": "video_id",
}


async def _enqueue(
    session: AsyncSession,
    settings: Settings,
    kind: str,
    user_id: str,
    *,
    avatar_id: str | None = None,
    voice_id: str | None = None,
    video_id: str | None = None,
    payload: dict | None = None,
    priority: int = 100,
    ai_task_code: str | None = None,
) -> Job:
    job = Job(
        id=new_id(),
        kind=kind,
        user_id=user_id,
        avatar_id=avatar_id,
        voice_id=voice_id,
        video_id=video_id,
        status="queued",
        priority=priority,
        attempt=0,
        max_attempts=settings.job_max_attempts,
        run_after=utcnow(),
        progress=0,
        payload_json=json.dumps(payload, ensure_ascii=False) if payload else None,
        ai_task_code=ai_task_code,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    session.add(job)
    try:
        await session.flush()
    except Exception as exc:  # 部分唯一索引冲突 → 同一资源已有活跃任务
        raise AppError(RESOURCE_BUSY) from exc
    logger.info("入队 kind=%s job_id=%s user_id=%s", kind, job.id, user_id)
    notify_worker()
    return job


async def enqueue_avatar_prepare(session: AsyncSession, settings: Settings, avatar: Avatar) -> Job:
    return await _enqueue(
        session,
        settings,
        "avatar_prepare",
        avatar.user_id,
        avatar_id=avatar.id,
        payload={"source_rel_path": avatar.source_rel_path},
    )


async def enqueue_voice_train(
    session: AsyncSession, settings: Settings, voice: Voice
) -> Job:
    return await _enqueue(
        session,
        settings,
        "voice_train",
        voice.user_id,
        voice_id=voice.id,
        payload={"sample_rel_path": voice.sample_rel_path},
    )


async def enqueue_video_synthesize(
    session: AsyncSession,
    settings: Settings,
    video: Video,
    *,
    audio_rel_path: str,
    video_rel_path: str,
    ai_task_code: str,
) -> Job:
    return await _enqueue(
        session,
        settings,
        "video_synthesize",
        video.user_id,
        video_id=video.id,
        payload={
            "audio_rel_path": audio_rel_path,
            "video_rel_path": video_rel_path,
            "title": video.title,
        },
        ai_task_code=ai_task_code,
    )


# ---------------------------------------------------------------- worker 唤醒
_worker_event = None


def set_worker_event(event) -> None:
    global _worker_event
    _worker_event = event


def notify_worker() -> None:
    ev = _worker_event
    if ev is not None:
        try:
            ev.set()
        except RuntimeError:  # pragma: no cover - 无事件循环场景
            pass


# ---------------------------------------------------------------- 状态流转
async def update_video_progress(
    session: AsyncSession, video_id: str, progress: int, status: str | None = None
) -> Video | None:
    video = await session.get(Video, video_id)
    if video is None:
        return None
    video.progress = max(0, min(100, progress))
    if status:
        video.status = status
    video.updated_at = utcnow()
    return video


async def mark_video_success(
    session: AsyncSession, video_id: str, output_rel_path: str, duration_ms: int | None
) -> Video | None:
    video = await session.get(Video, video_id)
    if video is None:
        return None
    video.status = "success"
    video.progress = 100
    video.output_rel_path = output_rel_path
    video.duration_ms = duration_ms or video.duration_ms
    video.error_code = None
    video.error_message = None
    video.completed_at = utcnow()
    video.updated_at = utcnow()
    return video


async def mark_video_failed(
    session: AsyncSession, video_id: str, code: str, message: str
) -> Video | None:
    video = await session.get(Video, video_id)
    if video is None:
        return None
    video.status = "failed"
    video.error_code = code
    video.error_message = message
    video.completed_at = utcnow()
    video.updated_at = utcnow()
    return video


async def mark_video_queued(session: AsyncSession, video_id: str) -> Video | None:
    video = await session.get(Video, video_id)
    if video is None:
        return None
    video.status = "queued"
    video.progress = 0
    video.updated_at = utcnow()
    return video


async def cancel_active_jobs(session: AsyncSession, *, avatar_id=None, voice_id=None) -> None:
    stmt = select(Job).where(Job.status.in_(("queued", "running")))
    if avatar_id:
        stmt = stmt.where(Job.avatar_id == avatar_id)
    if voice_id:
        stmt = stmt.where(Job.voice_id == voice_id)
    for job in (await session.scalars(stmt)).all():
        job.status = "canceled"
        job.finished_at = utcnow()
        job.updated_at = utcnow()


async def queue_position(session: AsyncSession, job_id: str) -> int | None:
    job = await session.get(Job, job_id)
    if job is None or job.status != "queued":
        return None
    from sqlalchemy import func

    count = await session.scalar(
        select(func.count(Job.id)).where(
            Job.kind == job.kind,
            Job.status == "queued",
            Job.run_after <= job.run_after,
            Job.id != job.id,
        )
    )
    return int(count or 0) + 1


def backoff_seconds(settings: Settings, attempt: int) -> float:
    seq = settings.backoff_sequence
    if not seq:
        return 10.0
    idx = min(max(attempt - 1, 0), len(seq) - 1)
    return seq[idx]


def lease_deadline(settings: Settings):
    return utcnow() + timedelta(seconds=settings.job_lease_seconds)
