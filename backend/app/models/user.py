"""账号域：users / auth_sessions。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, uuid_pk
from ..utils import new_id


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = uuid_pk()
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    password_changed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    __table_args__ = (
        Index("ix_auth_sessions_user", "user_id", "revoked_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
