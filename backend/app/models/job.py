"""任务域：jobs（数据库即队列，见设计_生成任务与队列.md）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, uuid_pk
from ..utils import utcnow

JOB_KINDS = ("avatar_prepare", "voice_train", "video_synthesize")
JOB_STATUSES = ("queued", "running", "succeeded", "failed", "canceled")
ACTIVE_JOB_STATUSES = ("queued", "running")


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        Index("ix_jobs_claim", "status", "run_after", "priority", "created_at"),
        Index("ix_jobs_user", "user_id", "created_at"),
        Index("ix_jobs_video", "video_id", "created_at"),
        # 同一资源同时只允许一个活跃任务：三个部分唯一索引（NULL 互不相等，不能合并成复合索引）
        Index(
            "uq_jobs_active_video",
            "video_id",
            unique=True,
            sqlite_where=text("status IN ('queued','running')"),
            postgresql_where=text("status IN ('queued','running')"),
        ),
        Index(
            "uq_jobs_active_avatar",
            "avatar_id",
            unique=True,
            sqlite_where=text("status IN ('queued','running')"),
            postgresql_where=text("status IN ('queued','running')"),
        ),
        Index(
            "uq_jobs_active_voice",
            "voice_id",
            unique=True,
            sqlite_where=text("status IN ('queued','running')"),
            postgresql_where=text("status IN ('queued','running')"),
        ),
        CheckConstraint(
            "kind IN ('avatar_prepare','voice_train','video_synthesize')",
            name="job_kind",
        ),
        CheckConstraint(
            "status IN ('queued','running','succeeded','failed','canceled')",
            name="job_status",
        ),
        CheckConstraint(
            "(CASE WHEN avatar_id IS NOT NULL THEN 1 ELSE 0 END)"
            " + (CASE WHEN voice_id IS NOT NULL THEN 1 ELSE 0 END)"
            " + (CASE WHEN video_id IS NOT NULL THEN 1 ELSE 0 END) = 1",
            name="job_single_resource",
        ),
    )

    id: Mapped[str] = uuid_pk()
    kind: Mapped[str] = mapped_column(String(24), nullable=False)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    avatar_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("avatars.id", ondelete="CASCADE"), nullable=True
    )
    voice_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("voices.id", ondelete="CASCADE"), nullable=True
    )
    video_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="queued")
    priority: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=100)
    attempt: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=3)
    run_after: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    lease_owner: Mapped[str | None] = mapped_column(String(64), nullable=True)
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    progress: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    ai_task_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(48), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)