"""密码、令牌与当前用户依赖。

- 密码：Argon2id（argon2-cffi 默认参数）；
- 访问令牌：JWT HS256，声明 sub/sid/typ/iat/exp；
- 刷新令牌：32 字节随机串，库里只存 SHA-256；
- 当前用户：校验签名 + exp + typ + 会话未撤销 + 用户 active。
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import timedelta, timezone
from typing import Annotated

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import Settings, get_settings
from .db import Database
from .errors import (
    AppError,
    AUTH_ACCOUNT_DISABLED,
    AUTH_INVALID_CREDENTIALS,
    AUTH_TOKEN_EXPIRED,
    AUTH_TOKEN_INVALID,
    AUTH_WEAK_PASSWORD,
)
from .models import AuthSession, User
from .utils import sha256_hex, utcnow

ACCESS_TOKEN_TYPE = "access"
REFRESH_COOKIE_NAME = "hg_refresh"

_hasher = PasswordHasher()
# 邮箱不存在时也执行一次哈希校验，避免通过响应时间探测邮箱是否注册
_DUMMY_HASH = _hasher.hash("heygem-dummy-password-for-timing")


# ------------------------------------------------------------------ 密码
def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError, ValueError):
        return False


def burn_hash_check(password: str) -> None:
    """固定耗时的假校验（邮箱不存在时调用）。"""
    verify_password(_DUMMY_HASH, password)


def validate_password_strength(password: str) -> None:
    if not isinstance(password, str) or not (8 <= len(password) <= 128):
        raise AppError(AUTH_WEAK_PASSWORD)


def verify_credentials(user: User | None, password: str) -> User:
    if user is None:
        burn_hash_check(password)
        raise AppError(AUTH_INVALID_CREDENTIALS)
    if not verify_password(user.password_hash, password):
        raise AppError(AUTH_INVALID_CREDENTIALS)
    if user.status != "active":
        raise AppError(AUTH_ACCOUNT_DISABLED)
    return user


# ------------------------------------------------------------------ 令牌
def new_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def refresh_token_digest(token: str) -> str:
    return sha256_hex(token)


def create_access_token(settings: Settings, user_id: str, session_id: str) -> tuple[str, int]:
    now = utcnow()
    exp = now + timedelta(seconds=settings.access_token_ttl_seconds)
    payload = {
        "sub": user_id,
        "sid": session_id,
        "typ": ACCESS_TOKEN_TYPE,
        # utcnow() 是 naive UTC：必须显式标注时区再取时间戳，否则会被当成当地时间
        "iat": int(now.replace(tzinfo=timezone.utc).timestamp()),
        "exp": int(exp.replace(tzinfo=timezone.utc).timestamp()),
    }
    token = jwt.encode(payload, settings.load_secret(), algorithm="HS256")
    return token, settings.access_token_ttl_seconds


def decode_access_token(settings: Settings, token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.load_secret(), algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise AppError(AUTH_TOKEN_EXPIRED) from exc
    except jwt.PyJWTError as exc:
        raise AppError(AUTH_TOKEN_INVALID) from exc
    if payload.get("typ") != ACCESS_TOKEN_TYPE:
        raise AppError(AUTH_TOKEN_INVALID)
    if not payload.get("sub") or not payload.get("sid"):
        raise AppError(AUTH_TOKEN_INVALID)
    return payload


# ------------------------------------------------------------------ 依赖
@dataclass(slots=True)
class AuthContext:
    """鉴权上下文：user + session，供路由层显式传递 user_id。"""

    user: User
    session: AuthSession

    @property
    def user_id(self) -> str:
        return self.user.id


def _bearer_token(request: Request) -> str:
    header = request.headers.get("authorization") or ""
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise AppError(AUTH_TOKEN_INVALID)
    return token.strip()


async def _resolve_context(request: Request) -> AuthContext:
    settings: Settings = request.app.state.settings
    token = _bearer_token(request)
    payload = decode_access_token(settings, token)

    db: Database = request.app.state.db
    async with db.session() as session:
        user = await session.get(User, payload["sub"])
        if user is None or user.status != "active":
            raise AppError(AUTH_TOKEN_INVALID)
        auth_session = await session.get(AuthSession, payload["sid"])
        if (
            auth_session is None
            or auth_session.revoked_at is not None
            or auth_session.user_id != user.id
            or auth_session.expires_at <= utcnow()
        ):
            raise AppError(AUTH_TOKEN_INVALID)
        session.expunge(user)
        session.expunge(auth_session)
    return AuthContext(user=user, session=auth_session)


async def current_auth(request: Request) -> AuthContext:
    return await _resolve_context(request)


async def current_user(ctx: Annotated[AuthContext, Depends(current_auth)]) -> User:
    return ctx.user


CurrentAuth = Annotated[AuthContext, Depends(current_auth)]
CurrentUser = Annotated[User, Depends(current_user)]


def get_settings_dep() -> Settings:
    return get_settings()


async def get_db_session(request: Request):  # pragma: no cover - 由路由依赖调用
    db: Database = request.app.state.db
    async with db.session() as session:
        yield session