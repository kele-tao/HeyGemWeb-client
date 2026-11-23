"""数据库引擎、会话工厂与事务辅助。

- 本地/演示：SQLite（WAL + busy_timeout），单进程；
- 生产：HEYGEM_DATABASE_URL 指向 PostgreSQL，同一套模型定义。
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from .config import Settings
from .models.base import Base

logger = logging.getLogger("heygem.db")


class Database:
    """引擎与会话工厂的持有者（应用装配时创建一次）。"""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.url = settings.effective_database_url
        self.engine: AsyncEngine = self._create_engine()
        self.session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
            self.engine, expire_on_commit=False, autoflush=False
        )

    @property
    def is_sqlite(self) -> bool:
        return self.url.startswith("sqlite")

    def _create_engine(self) -> AsyncEngine:
        connect_args: dict[str, object] = {}
        if self.is_sqlite:
            connect_args = {"timeout": 30}
        engine = create_async_engine(
            self.url,
            echo=False,
            future=True,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
        if self.is_sqlite:

            @event.listens_for(engine.sync_engine, "connect")
            def _sqlite_pragmas(dbapi_conn, _record):  # pragma: no cover - 驱动回调
                cursor = dbapi_conn.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA busy_timeout=5000")
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()

        return engine

    async def dispose(self) -> None:
        await self.engine.dispose()

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        """一次业务操作一个会话；异常回滚，正常自动提交。"""
        session = self.session_factory()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    @asynccontextmanager
    async def begin_immediate(self) -> AsyncIterator[AsyncConnection]:
        """SQLite 原子领取：BEGIN IMMEDIATE 立即取写锁（PostgreSQL 用行锁）。"""
        async with self.engine.connect() as conn:
            await conn.execute(text("BEGIN IMMEDIATE"))
            try:
                yield conn
                await conn.commit()
            except Exception:
                await conn.rollback()
                raise


def create_all(engine: AsyncEngine) -> None:
    """测试/无 Alembic 场景的建表入口（生产走 alembic upgrade head）。"""
    import asyncio

    async def _run() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.get_event_loop().run_until_complete(_run())
