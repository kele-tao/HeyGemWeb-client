"""资源类响应结构（字段即对外契约，snake_case）。"""

from __future__ import annotations

from pydantic import BaseModel


class AvatarOut(BaseModel):
    id: str
    name: str
    status: str
    thumb_url: str | None = None
    video_url: str | None = None
    duration_ms: int | None = None
    width: int | None = None
    height: int | None = None
    size_bytes: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: str
    updated_at: str


class VoiceOut(BaseModel):
    id: str
    name: str
    status: str
    sample_url: str | None = None
    duration_ms: int | None = None
    size_bytes: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: str
    updated_at: str


class VideoOut(BaseModel):
    id: str
    title: str
    status: str
    progress: int = 0
    queue_position: int | None = None
    thumb_url: str | None = None
    stream_url: str | None = None
    download_url: str | None = None
    share_url: str | None = None
    avatar_id: str | None = None
    voice_id: str | None = None
    script: str | None = None
    category: str | None = None
    duration_ms: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: str
    updated_at: str
    completed_at: str | None = None


class VideoProgressOut(BaseModel):
    id: str
    status: str
    progress: int
    queue_position: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    stream_url: str | None = None
    download_url: str | None = None
    share_url: str | None = None
    updated_at: str


class StatsOut(BaseModel):
    videos: int = 0
    avatars: int = 0
    voices: int = 0
    success_rate: float = 0.0
    active_tasks: int = 0


class ServerInfo(BaseModel):
    ai_mode: str
    app_env: str
    version: str


class BootstrapOut(BaseModel):
    user: dict
    avatars: list[AvatarOut]
    voices: list[VoiceOut]
    videos: list[VideoOut]
    stats: StatsOut
    server: ServerInfo


class AuditionOut(BaseModel):
    url: str
    cached: bool


class ShareOut(BaseModel):
    share_token: str
    share_url: str


class ShareMetaOut(BaseModel):
    title: str
    duration_ms: int | None = None
    created_at: str


class SystemStatusOut(BaseModel):
    app_env: str
    ai_mode: str
    version: str
    services: dict[str, str]
