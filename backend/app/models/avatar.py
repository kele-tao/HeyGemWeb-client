"""素材域：avatars（数字人）。"""

from __future__ import annotations

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, uuid_pk

AVATAR_STATUSES = ("processing", "ready", "failed")


class Avatar(Base, TimestampMixin):
    __tablename__ = "avatars"
    __table_args__ = (
        Index("ix_avatars_user_created", "user_id", "created_at"),
        Index("ix_avatars_user_status", "user_id", "status"),
        CheckConstraint("status IN ('processing','ready','failed')", name="avatar_status"),
    )

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="processing")
    source_rel_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumb_rel_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(48), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)