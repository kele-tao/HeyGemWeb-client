"""存储与配置：路径穿越、签名过期、生产禁 mock 守卫。"""

from __future__ import annotations

import time

import pytest

from app.config import Settings
from app.errors import AppError
from app.storage import Storage


@pytest.mark.asyncio
async def test_resolve_rejects_path_traversal(app_instance):
    storage = app_instance.state.storage
    for bad in ("../etc/passwd", "/etc/passwd", "users/../../x", ""):
        with pytest.raises(AppError):
            storage.resolve(bad)


@pytest.mark.asyncio
async def test_signature_expiry(app_instance):
    storage = app_instance.state.storage
    url = storage.sign("avatar-thumb", "abc", "user-1", ttl=-10)
    exp = url.split("exp=")[1].split("&")[0]
    sig = url.split("sig=")[1]
    with pytest.raises(AppError):
        storage.verify_signature("avatar-thumb", "abc", "user-1", exp, sig)


@pytest.mark.asyncio
async def test_signature_bound_to_user(app_instance):
    storage = app_instance.state.storage
    url = storage.sign("avatar-thumb", "abc", "user-1")
    exp = url.split("exp=")[1].split("&")[0]
    sig = url.split("sig=")[1]
    with pytest.raises(AppError):
        storage.verify_signature("avatar-thumb", "abc", "user-2", exp, sig)


def test_production_mock_guard(monkeypatch, tmp_path):
    from app.config import run_startup_guards

    monkeypatch.setenv("HEYGEM_MOCK_DELAY_FACTOR", "0")
    settings = Settings(
        app_env="production",
        ai_mode="mock",
        data_root=str(tmp_path),
        jwt_secret="x" * 40,
        allow_mock_in_production=False,
    )
    with pytest.raises(RuntimeError):
        run_startup_guards(settings)

    allowed = Settings(
        app_env="production",
        ai_mode="mock",
        data_root=str(tmp_path),
        jwt_secret="x" * 40,
        allow_mock_in_production=True,
    )
    run_startup_guards(allowed)  # 显式允许时启动成功


def test_backoff_config_parsing():
    settings = Settings(job_retry_backoff_seconds="5, 15 ,45")
    assert settings.backoff_sequence == [5.0, 15.0, 45.0]


def test_data_root_paths_are_derived(tmp_path):
    settings = Settings(data_root=str(tmp_path))
    assert settings.db_path == tmp_path / "db" / "app.db"
    assert settings.tts_handoff_path == tmp_path / "handoff" / "tts"
    assert settings.effective_database_url.startswith("sqlite+aiosqlite")
