"""ORM 基类与公共列约定（见设计_数据模型.md §一）。"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, MetaData, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from ..utils import new_id, utcnow

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def uuid_pk() -> Mapped[str]:
    return mapped_column(String(36), primary_key=True, default=new_id)


class TimestampMixin:
    """created_at / updated_at：统一 UTC naive，出参转 ISO8601 带 Z。"""

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


def iso(dt: datetime | None) -> str | None:
    """UTC naive → ISO8601 带 Z。"""
    if dt is None:
        return None
    return dt.replace(microsecond=dt.microsecond).strftime("%Y-%m-%dT%H:%M:%SZ")


__all__ = ["Base", "TimestampMixin", "uuid_pk", "iso", "new_id", "uuid"]
