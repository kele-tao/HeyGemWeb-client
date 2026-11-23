"""账号与鉴权路由。"""

from __future__ import annotations

from fastapi import APIRouter, Request, Response, status

from .. import errors
from ..config import Settings
from ..errors import AppError, AUTH_RATE_LIMITED
from ..schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from ..security import CurrentAuth, REFRESH_COOKIE_NAME
from ..services import auth_service
from ..utils import logger
from .deps import db_session
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, request: Request, settings: Settings, token: str) -> None:
    secure = settings.app_env == "production" and (
        request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=settings.refresh_token_ttl_days * 86400,
        path="/api/auth",
        httponly=True,
        samesite="lax",
        secure=secure,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/auth")
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value="",
        max_age=0,
        path="/api/auth",
        httponly=True,
        samesite="lax",
    )


def _client_meta(request: Request) -> dict:
    return {
        "user_agent": request.headers.get("user-agent"),
        "client_ip": (request.client.host if request.client else None),
    }


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
) -> AuthResponse:
    settings: Settings = request.app.state.settings
    request.app.state.rate_limiter.check(
        key=f"register:{_client_meta(request)['client_ip']}", limit=20, window=300
    )
    result = await auth_service.register(
        session, settings, payload.email, payload.password, **_client_meta(request)
    )
    _set_refresh_cookie(response, request, settings, result.pop("_refresh_token"))
    return AuthResponse(**result)


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
) -> AuthResponse:
    settings: Settings = request.app.state.settings
    limiter = request.app.state.rate_limiter
    client_ip = _client_meta(request)["client_ip"]
    limiter.check(key=f"login-ip:{client_ip}", limit=20, window=300)
    limiter.check(key=f"login-email:{payload.email.strip().lower()}", limit=5, window=300)
    result = await auth_service.login(
        session, settings, payload.email, payload.password, **_client_meta(request)
    )
    _set_refresh_cookie(response, request, settings, result.pop("_refresh_token"))
    return AuthResponse(**result)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
) -> TokenResponse:
    settings: Settings = request.app.state.settings
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    result = await auth_service.refresh(session, settings, token)
    _set_refresh_cookie(response, request, settings, result.pop("_refresh_token"))
    result.pop("user", None)
    return TokenResponse(**result)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
) -> Response:
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    await auth_service.logout(session, token)
    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserOut)
async def me(ctx: CurrentAuth) -> UserOut:
    return UserOut(**auth_service.user_out(ctx.user))


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    ctx: CurrentAuth,
    response: Response,
    session: AsyncSession = Depends(db_session),
) -> Response:
    await auth_service.change_password(
        session, ctx.user, ctx.session.id, payload.old_password, payload.new_password
    )
    logger.info("修改密码成功 user_id=%s", ctx.user_id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
