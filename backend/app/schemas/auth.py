"""账号相关请求/响应结构与字段校验。"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _differs(cls, v: str, info):
        old = info.data.get("old_password")
        if old is not None and v == old:
            from ..errors import AppError, AUTH_PASSWORD_UNCHANGED

            raise AppError(AUTH_PASSWORD_UNCHANGED)
        return v


class UserOut(BaseModel):
    id: str
    email: str
    created_at: str
    last_login_at: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(TokenResponse):
    user: UserOut
