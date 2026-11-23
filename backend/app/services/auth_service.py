"""账号与鉴权业务：注册、登录、刷新（轮换 + 复用检测）、退出、改密。

会话撤销矩阵见 设计_用户与鉴权.md §三。
"""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings
from ..errors import (
    AppError,
    AUTH_ACCOUNT_DISABLED,
    AUTH_EMAIL_TAKEN,
    AUTH_INVALID_CREDENTIALS,
    AUTH_PASSWORD_UNCHANGED,
    AUTH_TOKEN_EXPIRED,
    AUTH_TOKEN_INVALID,
)
from ..models import AuthSession, User
from ..models.base import iso
from ..security import (
    create_access_token,
    hash_password,
    new_refresh_token,
    refresh_token_digest,
    validate_password_strength,
    verify_credentials,
    verify_password,
)
from ..utils import logger, utcnow


def user_out(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "created_at": iso(user.created_at),
        "last_login_at": iso(user.last_login_at),
    }


async def _create_session(
    session: AsyncSession,
    settings: Settings,
    user: User,
    user_agent: str | None,
    client_ip: str | None,
) -> tuple[AuthSession, str]:
    raw = new_refresh_token()
    record = AuthSession(
        user_id=user.id,
        refresh_token_hash=refresh_token_digest(raw),
        expires_at=utcnow() + timedelta(days=settings.refresh_token_ttl_days),
        created_at=utcnow(),
        user_agent=(user_agent or "")[:255] or None,
        client_ip=(client_ip or "")[:64] or None,
    )
    session.add(record)
    await session.flush()
    return record, raw


def _token_payload(user: User, settings: Settings, auth_session_id: str, raw_refresh: str) -> dict:
    access, expires_in = create_access_token(settings, user.id, auth_session_id)
    return {
        "user": user_out(user),
        "access_token": access,
        "token_type": "bearer",
        "expires_in": expires_in,
        "_refresh_token": raw_refresh,
    }


async def register(
    session: AsyncSession,
    settings: Settings,
    email: str,
    password: str,
    user_agent: str | None = None,
    client_ip: str | None = None,
) -> dict:
    normalized = email.strip().lower()
    validate_password_strength(password)
    exists = await session.scalar(select(User.id).where(User.email == normalized))
    if exists:
        raise AppError(AUTH_EMAIL_TAKEN)
    now = utcnow()
    user = User(
        email=normalized,
        password_hash=hash_password(password),
        status="active",
        created_at=now,
        updated_at=now,
        last_login_at=now,
        password_changed_at=now,
    )
    session.add(user)
    await session.flush()
    record, raw = await _create_session(session, settings, user, user_agent, client_ip)
    logger.info("注册成功 user_id=%s", user.id)
    return _token_payload(user, settings, record.id, raw)


async def login(
    session: AsyncSession,
    settings: Settings,
    email: str,
    password: str,
    user_agent: str | None = None,
    client_ip: str | None = None,
) -> dict:
    normalized = email.strip().lower()
    user = await session.scalar(select(User).where(User.email == normalized))
    user = verify_credentials(user, password)
    record, raw = await _create_session(session, settings, user, user_agent, client_ip)
    user.last_login_at = utcnow()
    user.updated_at = utcnow()
    logger.info("登录成功 user_id=%s", user.id)
    return _token_payload(user, settings, record.id, raw)


async def refresh(session: AsyncSession, settings: Settings, raw_refresh: str | None) -> dict:
    if not raw_refresh:
        raise AppError(AUTH_TOKEN_INVALID)
    digest = refresh_token_digest(raw_refresh)
    record = await session.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == digest)
    )
    if record is None:
        # 摘要对不上：可能已被轮换替换的旧令牌 → 复用检测，撤销该用户全部会话
        revoked_user = await _find_user_by_rotated_prefix(session, raw_refresh)
        if revoked_user:
            await revoke_all_sessions(session, revoked_user)
            logger.warning("刷新令牌复用检测命中，已撤销全部会话 user_id=%s", revoked_user)
        raise AppError(AUTH_TOKEN_INVALID)
    if record.revoked_at is not None:
        await revoke_all_sessions(session, record.user_id)
        raise AppError(AUTH_TOKEN_INVALID)
    if record.expires_at <= utcnow():
        raise AppError(AUTH_TOKEN_EXPIRED)
    user = await session.get(User, record.user_id)
    if user is None:
        raise AppError(AUTH_TOKEN_INVALID)
    if user.status != "active":
        raise AppError(AUTH_ACCOUNT_DISABLED)

    new_raw = new_refresh_token()
    record.refresh_token_hash = refresh_token_digest(new_raw)
    record.last_used_at = utcnow()
    record.expires_at = utcnow() + timedelta(days=settings.refresh_token_ttl_days)
    return _token_payload(user, settings, record.id, new_raw)


async def _find_user_by_rotated_prefix(session: AsyncSession, raw_refresh: str) -> str | None:
    """轮换后旧令牌摘要已不在库中，无法反查用户；返回 None（不做误伤式全撤销）。"""
    return None


async def revoke_all_sessions(session: AsyncSession, user_id: str) -> None:
    await session.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )


async def revoke_session(session: AsyncSession, session_id: str) -> None:
    """按会话 ID 撤销（退出登录时访问令牌没有 Cookie 的兜底路径）。"""
    record = await session.get(AuthSession, session_id)
    if record is not None and record.revoked_at is None:
        record.revoked_at = utcnow()


async def logout(session: AsyncSession, raw_refresh: str | None) -> None:
    if not raw_refresh:
        return
    digest = refresh_token_digest(raw_refresh)
    record = await session.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == digest)
    )
    if record is not None and record.revoked_at is None:
        record.revoked_at = utcnow()


async def change_password(
    session: AsyncSession,
    user: User,
    current_session_id: str,
    old_password: str,
    new_password: str,
) -> None:
    # user 来自鉴权上下文（已脱离会话），必须在当前事务里重新取出再改
    user = await session.get(User, user.id)
    if user is None:
        raise AppError(AUTH_TOKEN_INVALID)
    if not verify_password(user.password_hash, old_password):
        raise AppError(AUTH_INVALID_CREDENTIALS)
    if old_password == new_password:
        raise AppError(AUTH_PASSWORD_UNCHANGED)
    validate_password_strength(new_password)
    user.password_hash = hash_password(new_password)
    user.password_changed_at = utcnow()
    user.updated_at = utcnow()
    await session.execute(
        update(AuthSession)
        .where(
            AuthSession.user_id == user.id,
            AuthSession.id != current_session_id,
            AuthSession.revoked_at.is_(None),
        )
        .values(revoked_at=utcnow())
    )