"""作品域：videos。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, uuid_pk

VIDEO_STATUSES = ("queued", "processing", "success", "failed")


class Video(Base, TimestampMixin):
    __tablename__ = "videos"
    __table_args__ = (
        Index("ix_videos_user_created", "user_id", "created_at"),
        Index("ix_videos_user_status", "user_id", "status"),
        CheckConstraint(
            "status IN ('queued','processing','success','failed')", name="video_status"
        ),
        CheckConstraint("progress BETWEEN 0 AND 100", name="video_progress"),
    )

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    avatar_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("avatars.id", ondelete="SET NULL"), nullable=True
    )
    voice_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("voices.id", ondelete="SET NULL"), nullable=True
    )
    script: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="queued")
    progress: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    thumb_rel_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_rel_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_rel_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category: Mapped[str | None] = mapped_column(String(32), nullable=True)
    share_token: Mapped[str | None] = mapped_column(String(43), unique=True, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(48), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)