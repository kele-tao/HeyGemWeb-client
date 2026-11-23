"""素材域：voices（声音）/ audition_caches（试听缓存）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, uuid_pk

VOICE_STATUSES = ("training", "complete", "failed")


class Voice(Base, TimestampMixin):
    __tablename__ = "voices"
    __table_args__ = (
        Index("ix_voices_user_created", "user_id", "created_at"),
        Index("ix_voices_user_status", "user_id", "status"),
        CheckConstraint("status IN ('training','complete','failed')", name="voice_status"),
    )

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="training")
    sample_rel_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    asr_rel_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(48), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class AuditionCache(Base):
    __tablename__ = "audition_caches"
    __table_args__ = (
        Index("uq_audition_voice_text", "voice_id", "text_hash", unique=True),
    )

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    voice_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("voices.id", ondelete="CASCADE"), nullable=False
    )
    text_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    text_content: Mapped[str] = mapped_column(Text, nullable=False)
    audio_rel_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)