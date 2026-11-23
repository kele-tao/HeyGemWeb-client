"""路由公共依赖：数据库会话、存储、AI provider、序列化器。"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession


def get_storage(request: Request):
    return request.app.state.storage


def get_serializer(request: Request):
    return request.app.state.serializer


def get_provider(request: Request):
    return request.app.state.provider


def get_settings_from_app(request: Request):
    return request.app.state.settings


@asynccontextmanager
async def session_scope(request: Request) -> AsyncIterator[AsyncSession]:
    db = request.app.state.db
    async with db.session() as session:
        yield session


async def db_session(request: Request) -> AsyncIterator[AsyncSession]:
    """FastAPI 依赖：一次请求一个会话，正常退出提交。"""
    db = request.app.state.db
    async with db.session() as session:
        yield session


def parse_status_filter(status: str | None) -> list[str]:
    if not status:
        return []
    return [s.strip() for s in status.split(",") if s.strip()]


def parse_limit(limit: int, default: int = 50, maximum: int = 200) -> int:
    if limit is None:
        return default
    return max(1, min(int(limit), maximum))


def request_base(request: Request) -> str:
    """按 X-Forwarded-Proto / Host 生成外部基址（分享链接用）。"""
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    return f"{proto}://{host}" if host else ""
