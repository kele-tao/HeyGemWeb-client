"""模型 → 对外 JSON 的序列化（含签名 URL 与排队位次）。"""

from __future__ import annotations

from ..config import Settings
from ..models import Avatar, Video, Voice
from ..models.base import iso
from ..schemas.resource import AvatarOut, VideoOut, VideoProgressOut, VoiceOut
from ..storage import Storage


class Serializer:
    def __init__(self, settings: Settings, storage: Storage) -> None:
        self.settings = settings
        self.storage = storage

    # ------------------------------------------------------------ 数字人
    def avatar(self, row: Avatar) -> AvatarOut:
        thumb = (
            self.storage.sign("avatar-thumb", row.id, row.user_id)
            if row.thumb_rel_path
            else None
        )
        video = (
            self.storage.sign("avatar-video", row.id, row.user_id)
            if row.source_rel_path
            else None
        )
        return AvatarOut(
            id=row.id,
            name=row.name,
            status=row.status,
            thumb_url=thumb,
            video_url=video,
            duration_ms=row.duration_ms,
            width=row.width,
            height=row.height,
            size_bytes=row.size_bytes,
            error_code=row.error_code,
            error_message=row.error_message,
            created_at=iso(row.created_at) or "",
            updated_at=iso(row.updated_at) or "",
        )

    # ------------------------------------------------------------ 声音
    def voice(self, row: Voice) -> VoiceOut:
        sample = (
            self.storage.sign("voice-sample", row.id, row.user_id)
            if row.sample_rel_path
            else None
        )
        return VoiceOut(
            id=row.id,
            name=row.name,
            status=row.status,
            sample_url=sample,
            duration_ms=row.duration_ms,
            size_bytes=row.size_bytes,
            error_code=row.error_code,
            error_message=row.error_message,
            created_at=iso(row.created_at) or "",
            updated_at=iso(row.updated_at) or "",
        )

    # ------------------------------------------------------------ 作品
    def _share_url(self, row: Video, request_base: str | None) -> str | None:
        if not row.share_token:
            return None
        base = (request_base or "").rstrip("/")
        return f"{base}/api/share/{row.share_token}" if base else f"/api/share/{row.share_token}"

    def video(
        self,
        row: Video,
        *,
        queue_position: int | None = None,
        request_base: str | None = None,
    ) -> VideoOut:
        success = row.status == "success" and bool(row.output_rel_path)
        return VideoOut(
            id=row.id,
            title=row.title,
            status=row.status,
            progress=row.progress,
            queue_position=queue_position if row.status == "queued" else None,
            thumb_url=self.storage.sign("video-thumb", row.id, row.user_id)
            if row.thumb_rel_path
            else None,
            stream_url=self.storage.sign("video-stream", row.id, row.user_id) if success else None,
            download_url=self.storage.sign("video-download", row.id, row.user_id)
            if success
            else None,
            share_url=self._share_url(row, request_base),
            avatar_id=row.avatar_id,
            voice_id=row.voice_id,
            script=row.script,
            category=row.category,
            duration_ms=row.duration_ms,
            error_code=row.error_code,
            error_message=row.error_message,
            created_at=iso(row.created_at) or "",
            updated_at=iso(row.updated_at) or "",
            completed_at=iso(row.completed_at),
        )

    def video_progress(
        self,
        row: Video,
        *,
        queue_position: int | None = None,
        request_base: str | None = None,
    ) -> VideoProgressOut:
        success = row.status == "success" and bool(row.output_rel_path)
        return VideoProgressOut(
            id=row.id,
            status=row.status,
            progress=row.progress,
            queue_position=queue_position if row.status == "queued" else None,
            error_code=row.error_code,
            error_message=row.error_message,
            stream_url=self.storage.sign("video-stream", row.id, row.user_id) if success else None,
            download_url=self.storage.sign("video-download", row.id, row.user_id)
            if success
            else None,
            share_url=self._share_url(row, request_base),
            updated_at=iso(row.updated_at) or "",
        )
