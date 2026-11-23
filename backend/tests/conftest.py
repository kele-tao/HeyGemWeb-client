"""pytest 夹具：独立临时 DATA_ROOT + 每个用例全新 SQLite，AI 走 mock 模式。"""

from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

BACKEND_ROOT = Path(__file__).resolve().parent.parent

_TMP_DIRS: list[Path] = []


def _root() -> Path:
    root = Path(tempfile.mkdtemp(prefix="heygem-test-"))
    _TMP_DIRS.append(root)
    return root


@pytest.fixture(scope="session", autouse=True)
def _env():
    """会话级环境：固定 DATA_ROOT 与数据库 URL（每个用例删除库文件重建）。"""
    root = _root()
    os.environ.update(
        {
            "HEYGEM_APP_ENV": "test",
            "HEYGEM_AI_MODE": "mock",
            "HEYGEM_DATA_ROOT": str(root),
            "HEYGEM_DATABASE_URL": f"sqlite+aiosqlite:///{(root / 'db' / 'app.db').as_posix()}",
            "HEYGEM_JWT_SECRET": "test-secret-key-for-pytest-only-0123456789",
            "HEYGEM_MOCK_DELAY_FACTOR": "0",
            "HEYGEM_WORKER_ENABLED": "true",
            "HEYGEM_F2F_POLL_INTERVAL_SECONDS": "0.05",
            "HEYGEM_JOB_LEASE_SECONDS": "120",
        }
    )
    yield root
    for path in _TMP_DIRS:
        shutil.rmtree(path, ignore_errors=True)


def isolate_storage() -> None:
    """每个用例独立 DATA_ROOT 与数据库文件。

    不复用同一个 db 文件：Windows 上 SQLite 句柄释放有延迟，复用+删除会偶发 WinError 32。
    """
    root = _root()
    os.environ["HEYGEM_DATA_ROOT"] = str(root)
    os.environ["HEYGEM_DATABASE_URL"] = (
        f"sqlite+aiosqlite:///{(root / 'db' / 'app.db').as_posix()}"
    )


@pytest_asyncio.fixture()
async def app_instance():
    """每个测试独立的 app（独立数据库 + 独立 worker）。"""
    from app.config import reset_settings_cache

    isolate_storage()
    reset_settings_cache()
    from app.main import create_app

    app = create_app()
    async with app.router.lifespan_context(app):
        try:
            yield app
        finally:
            # 先释放连接池，避免下个用例删除 SQLite 文件时被句柄占用
            await app.state.db.dispose()


@pytest_asyncio.fixture()
async def client(app_instance):
    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest_asyncio.fixture()
async def user_factory(client: AsyncClient):
    async def _create(email: str | None = None, password: str = "strong-pass-2026") -> dict:
        email = email or f"user-{uuid.uuid4().hex[:10]}@example.com"
        resp = await client.post("/api/auth/register", json={"email": email, "password": password})
        assert resp.status_code == 201, resp.text
        payload = resp.json()
        payload["password"] = password
        payload["headers"] = {"Authorization": f"Bearer {payload['access_token']}"}
        return payload

    yield _create


@pytest.fixture(scope="session")
def media_factory():
    """生成合法的媒体样本（时长满足业务下限，ffmpeg 可用）。"""
    cache: dict[str, Path] = {}
    tmp_root = Path(tempfile.mkdtemp(prefix="heygem-media-"))

    def _make(kind: str) -> Path:
        if kind in cache:
            return cache[kind]
        if kind == "video":
            target = tmp_root / "sample.mp4"
            cmd = (
                f'ffmpeg -y -f lavfi -i "testsrc=size=320x240:rate=15:duration=31" '
                f'-c:v libx264 -pix_fmt yuv420p "{target}"'
            )
        else:
            target = tmp_root / "sample.wav"
            cmd = (
                f'ffmpeg -y -f lavfi -i "sine=frequency=440:duration=31" '
                f'-c:a pcm_s16le "{target}"'
            )
        os.system(cmd + " > NUL 2>&1")
        assert target.exists() and target.stat().st_size > 0, f"媒体样本生成失败: {target}"
        cache[kind] = target
        return target

    yield _make
    shutil.rmtree(tmp_root, ignore_errors=True)