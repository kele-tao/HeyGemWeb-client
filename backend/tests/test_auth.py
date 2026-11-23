"""账号与鉴权：注册、登录、令牌、改密、越权。"""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_register_login_me_flow(client):
    email = "flow@example.com"
    reg = await client.post("/api/auth/register", json={"email": email, "password": "strong-pass-2026"})
    assert reg.status_code == 201
    body = reg.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    assert body["user"]["email"] == email
    assert "hg_refresh" in reg.cookies

    headers = {"Authorization": f"Bearer {body['access_token']}"}
    me = await client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == email

    login = await client.post("/api/auth/login", json={"email": email, "password": "strong-pass-2026"})
    assert login.status_code == 200
    assert login.json()["user"]["email"] == email


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client):
    email = "dup@example.com"
    first = await client.post("/api/auth/register", json={"email": email, "password": "strong-pass-2026"})
    assert first.status_code == 201
    second = await client.post(
        "/api/auth/register", json={"email": email.upper(), "password": "strong-pass-2026"}
    )
    assert second.status_code == 409
    assert second.json()["code"] == "AUTH_EMAIL_TAKEN"


@pytest.mark.asyncio
async def test_register_weak_password_422(client):
    resp = await client.post("/api/auth/register", json={"email": "weak@example.com", "password": "short"})
    assert resp.status_code == 422
    assert resp.json()["code"] in {"AUTH_WEAK_PASSWORD", "VALIDATION_ERROR"}


@pytest.mark.asyncio
async def test_login_wrong_password_same_code_as_unknown_email(client):
    email = "cred@example.com"
    await client.post("/api/auth/register", json={"email": email, "password": "strong-pass-2026"})
    wrong = await client.post("/api/auth/login", json={"email": email, "password": "wrong-password"})
    unknown = await client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "wrong-password"}
    )
    assert wrong.status_code == 401 and unknown.status_code == 401
    assert wrong.json()["code"] == unknown.json()["code"] == "AUTH_INVALID_CREDENTIALS"
    assert wrong.json()["message"] == unknown.json()["message"] == "邮箱或密码不正确"


@pytest.mark.asyncio
async def test_unauthorized_requests_rejected(client):
    assert (await client.get("/api/avatars")).status_code == 401
    assert (await client.get("/api/bootstrap")).status_code == 401
    bad = await client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert bad.status_code == 401
    assert bad.json()["code"] == "AUTH_TOKEN_INVALID"


@pytest.mark.asyncio
async def test_refresh_rotates_token(client):
    reg = await client.post(
        "/api/auth/register", json={"email": "rotate@example.com", "password": "strong-pass-2026"}
    )
    assert reg.status_code == 201
    old_cookie = reg.cookies.get("hg_refresh")
    refreshed = await client.post("/api/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]
    new_cookie = refreshed.cookies.get("hg_refresh")
    assert new_cookie and new_cookie != old_cookie


@pytest.mark.asyncio
async def test_logout_revokes_access_token(client, user_factory):
    user = await user_factory()
    assert (await client.get("/api/auth/me", headers=user["headers"])).status_code == 200
    logout = await client.post("/api/auth/logout", headers=user["headers"])
    assert logout.status_code == 204
    # 会话已撤销：旧访问令牌立即失效（不能只验签名）
    after = await client.get("/api/auth/me", headers=user["headers"])
    assert after.status_code == 401


@pytest.mark.asyncio
async def test_change_password_revokes_other_sessions(client, user_factory):
    user = await user_factory()
    other = await client.post(
        "/api/auth/login", json={"email": user["user"]["email"], "password": user["password"]}
    )
    assert other.status_code == 200
    changed = await client.post(
        "/api/auth/password",
        headers=user["headers"],
        json={"old_password": user["password"], "new_password": "brand-new-pass-2026"},
    )
    assert changed.status_code == 204
    # 当前会话续用
    assert (await client.get("/api/auth/me", headers=user["headers"])).status_code == 200
    # 其他会话被撤销
    stale = {"Authorization": f"Bearer {other.json()['access_token']}"}
    assert (await client.get("/api/auth/me", headers=stale)).status_code == 401
    # 旧密码不再可用
    old_login = await client.post(
        "/api/auth/login", json={"email": user["user"]["email"], "password": user["password"]}
    )
    assert old_login.status_code == 401


@pytest.mark.asyncio
async def test_change_password_same_value_422(client, user_factory):
    user = await user_factory()
    resp = await client.post(
        "/api/auth/password",
        headers=user["headers"],
        json={"old_password": user["password"], "new_password": user["password"]},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "AUTH_PASSWORD_UNCHANGED"


@pytest.mark.asyncio
async def test_bootstrap_shape(client, user_factory):
    user = await user_factory()
    resp = await client.get("/api/bootstrap", headers=user["headers"])
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"user", "avatars", "voices", "videos", "stats", "server"}
    assert body["videos"] == []
    assert body["stats"]["success_rate"] == 0.0
    assert body["server"]["ai_mode"] == "mock"
