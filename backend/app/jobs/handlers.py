"""三类任务处理器：avatar_prepare / voice_train / video_synthesize。

处理器只接收"任务行 + 已解析的资源"，不接触 HTTP 上下文。
"""

from __future__ import annotations

import asyncio
import shutil
from pathlib import Path

from ..ai.base import AIProvider
from ..config import Settings
from ..db import Database
from ..errors import (
    AppError,
    AI_RESULT_MISSING,
    AI_SERVICE_ERROR,
    JOB_TIMEOUT,
    SOURCE_FILE_MISSING,
)
from ..models import Avatar, Job, Video, Voice
from ..services import avatar_service, job_service, voice_service
from ..storage import Storage
from ..utils import logger


class Handlers:
    def __init__(self, db: Database, settings: Settings, storage: Storage, provider: AIProvider) -> None:
        self.db = db
        self.settings = settings
        self.storage = storage
        self.provider = provider

    # ------------------------------------------------------------ 数字人建档
    async def avatar_prepare(self, job: Job) -> None:
        payload = self._payload(job)
        async with self.db.session() as session:
            avatar = await session.get(Avatar, job.avatar_id)
            if avatar is None:
                raise AppError("RESOURCE_NOT_FOUND", "数字人已被删除")
            if avatar.status in ("ready", "failed") and job.attempt > 1:
                return
            source_rel = payload.get("source_rel_path") or avatar.source_rel_path
            if not source_rel:
                raise AppError(SOURCE_FILE_MISSING)
            source_path = self.storage.resolve(source_rel)
            if not source_path.exists():
                raise AppError(SOURCE_FILE_MISSING)
            avatar.status = "processing"
            avatar.updated_at = job.updated_at
            await session.flush()

        info = self.storage.probe(source_path)
        rel_dir = Storage.avatar_dir(job.user_id, avatar.id)
        thumb_full = self.storage.resolve(f"{rel_dir}/thumb.jpg")
        ok = self.storage.extract_thumbnail(source_path, thumb_full)
        thumb_rel = f"{rel_dir}/thumb.jpg" if ok else None

        async with self.db.session() as session:
            await avatar_service.mark_ready(session, avatar.id, thumb_rel, info)

    # ------------------------------------------------------------ 声音训练
    async def voice_train(self, job: Job) -> None:
        payload = self._payload(job)
        async with self.db.session() as session:
            voice = await session.get(Voice, job.voice_id)
            if voice is None:
                raise AppError("RESOURCE_NOT_FOUND", "声音已被删除")
            sample_rel = payload.get("sample_rel_path") or voice.sample_rel_path
            if not sample_rel:
                raise AppError(SOURCE_FILE_MISSING)
            sample_path = self.storage.resolve(sample_rel)
            if not sample_path.exists():
                raise AppError(SOURCE_FILE_MISSING)
            voice.status = "training"
            await session.flush()

        handoff_name = f"{voice.id}{Path(sample_path).suffix.lower() or '.wav'}"
        handoff_target = self.settings.tts_handoff_path / handoff_name
        handoff_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(sample_path, handoff_target)

        result = await self.provider.preprocess_voice(handoff_name)
        ref_rel = f"handoff/tts/{Path(result.reference_filename).name}"
        async with self.db.session() as session:
            await voice_service.mark_complete(
                session, voice.id, ref_rel, result.reference_text
            )
        logger.info("声音训练完成 voice_id=%s ref=%s", voice.id, ref_rel)

    # ------------------------------------------------------------ 视频合成
    async def video_synthesize(self, job: Job) -> None:
        payload = self._payload(job)
        async with self.db.session() as session:
            video = await session.get(Video, job.video_id)
            if video is None:
                raise AppError("RESOURCE_NOT_FOUND", "作品已被删除")
            audio_rel = payload.get("audio_rel_path") or video.audio_rel_path
            video_rel = payload.get("video_rel_path")
            if not audio_rel or not video_rel:
                raise AppError(SOURCE_FILE_MISSING)
            audio_path = self.storage.resolve(audio_rel)
            source_video = self.storage.resolve(video_rel)
            if not audio_path.exists() or not source_video.exists():
                raise AppError(SOURCE_FILE_MISSING)
            video.status = "processing"
            video.progress = 10
            video.updated_at = job.updated_at
            await session.flush()

        f2f = self.settings.f2f_handoff_path
        f2f_rel_dir = "handoff/f2f"
        code = job.ai_task_code or video.id
        audio_name = f"{video.id}_{job.id}_audio{Path(audio_path).suffix.lower() or '.wav'}"
        video_name = f"{video.id}_{job.id}_video{Path(source_video).suffix.lower() or '.mp4'}"
        shutil.copyfile(audio_path, f2f / audio_name)
        shutil.copyfile(source_video, f2f / video_name)

        await self.provider.f2f_submit(audio_name, video_name, code)

        async with self.db.session() as session:
            await job_service.update_video_progress(session, video.id, 20, status="processing")

        result = await self._poll(f2f, code)
        if result.status != 2:
            message = result.message or "视频合成失败"
            lowered = message.lower()
            if any(k in lowered for k in ("格式", "解析", "不支持", "invalid", "not support")):
                from ..errors import AI_REQUEST_REJECTED

                raise AppError(AI_REQUEST_REJECTED, message)
            raise AppError(AI_SERVICE_ERROR, message)

        rel_dir = Storage.video_dir(job.user_id, video.id)
        output_rel = f"{rel_dir}/output.mp4"
        output_path = self.storage.resolve(output_rel)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if self.provider.mode == "mock":
            source_artifact = self.settings.mock_assets_dir / "sample.mp4"
        else:
            if not result.result_rel_path:
                raise AppError(AI_RESULT_MISSING)
            source_artifact = f2f / str(result.result_rel_path).lstrip("/").replace("\\", "/")
            if not source_artifact.exists():
                # result 可能是相对 handoff 的多级路径
                alt = f2f / Path(str(result.result_rel_path)).name
                source_artifact = alt if alt.exists() else source_artifact
        if not source_artifact.exists():
            raise AppError(AI_RESULT_MISSING)

        shutil.copyfile(source_artifact, output_path)
        async with self.db.session() as session:
            await job_service.update_video_progress(session, video.id, 95, status="processing")

        duration_ms = None
        try:
            duration_ms = self.storage.probe(output_path).duration_ms
        except AppError:
            duration_ms = None

        async with self.db.session() as session:
            await job_service.mark_video_success(session, video.id, output_rel, duration_ms)

        # 清理 handoff 输入副本（AI 侧已读取）
        for name in (audio_name, video_name):
            try:
                (f2f / name).unlink(missing_ok=True)
            except OSError:  # pragma: no cover
                pass
        logger.info("视频合成成功 video_id=%s", video.id)

    # ------------------------------------------------------------ 内部
    async def _poll(self, handoff_dir: Path, code: str):
        deadline = asyncio.get_event_loop().time() + self.settings.job_timeout("video_synthesize")
        interval = max(0.2, float(self.settings.f2f_poll_interval_seconds))
        while True:
            result = await self.provider.f2f_query(code)
            if result.status == 2:
                return result
            if result.status not in (1,):
                return result
            if asyncio.get_event_loop().time() > deadline:
                raise AppError(JOB_TIMEOUT)
            await asyncio.sleep(interval)

    def _payload(self, job: Job) -> dict:
        from .queue import load_payload

        return load_payload(job)


def build_handlers(db, settings, storage, provider) -> dict:
    handlers = Handlers(db, settings, storage, provider)
    return {
        "avatar_prepare": handlers.avatar_prepare,
        "voice_train": handlers.voice_train,
        "video_synthesize": handlers.video_synthesize,
    }
