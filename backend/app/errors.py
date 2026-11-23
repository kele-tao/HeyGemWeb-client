"""统一业务异常与错误码表。

约定（见 ai-docs/后端设计/00_全局后端架构.md §三）：
- 业务层只抛 AppError，由 main.py 的异常处理器统一转成 {code, message, request_id}。
- 路由层禁止 try/except 改写响应结构。
"""

from __future__ import annotations

from typing import Any, Iterable

# ---------------------------------------------------------------- 错误码常量
VALIDATION_ERROR = "VALIDATION_ERROR"
AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
AUTH_EMAIL_TAKEN = "AUTH_EMAIL_TAKEN"
AUTH_WEAK_PASSWORD = "AUTH_WEAK_PASSWORD"
AUTH_PASSWORD_UNCHANGED = "AUTH_PASSWORD_UNCHANGED"
AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID"
AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
AUTH_ACCOUNT_DISABLED = "AUTH_ACCOUNT_DISABLED"
AUTH_RATE_LIMITED = "AUTH_RATE_LIMITED"
RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
RESOURCE_IN_USE = "RESOURCE_IN_USE"
RESOURCE_BUSY = "RESOURCE_BUSY"
RESOURCE_STATE_INVALID = "RESOURCE_STATE_INVALID"
MEDIA_TYPE_UNSUPPORTED = "MEDIA_TYPE_UNSUPPORTED"
MEDIA_TOO_LARGE = "MEDIA_TOO_LARGE"
MEDIA_DURATION_TOO_SHORT = "MEDIA_DURATION_TOO_SHORT"
MEDIA_DURATION_TOO_LONG = "MEDIA_DURATION_TOO_LONG"
MEDIA_PROBE_FAILED = "MEDIA_PROBE_FAILED"
MEDIA_SIGNATURE_INVALID = "MEDIA_SIGNATURE_INVALID"
SHARE_NOT_FOUND = "SHARE_NOT_FOUND"
AI_SERVICE_UNAVAILABLE = "AI_SERVICE_UNAVAILABLE"
AI_SERVICE_ERROR = "AI_SERVICE_ERROR"
AI_REQUEST_REJECTED = "AI_REQUEST_REJECTED"
AI_RESPONSE_INVALID = "AI_RESPONSE_INVALID"
AI_RESULT_MISSING = "AI_RESULT_MISSING"
STORAGE_PATH_INVALID = "STORAGE_PATH_INVALID"
INTERNAL_ERROR = "INTERNAL_ERROR"
JOB_TIMEOUT = "JOB_TIMEOUT"
JOB_INTERRUPTED = "JOB_INTERRUPTED"
SOURCE_FILE_MISSING = "SOURCE_FILE_MISSING"
RATE_LIMITED = "RATE_LIMITED"

# 中文文案（前端可直接展示）
MESSAGES: dict[str, str] = {
    VALIDATION_ERROR: "提交内容不合法",
    AUTH_INVALID_CREDENTIALS: "邮箱或密码不正确",
    AUTH_EMAIL_TAKEN: "该邮箱已注册",
    AUTH_WEAK_PASSWORD: "密码长度需为 8-128 位",
    AUTH_PASSWORD_UNCHANGED: "新密码不能与原密码相同",
    AUTH_TOKEN_INVALID: "登录状态无效，请重新登录",
    AUTH_TOKEN_EXPIRED: "登录已过期，请重新登录",
    AUTH_ACCOUNT_DISABLED: "账号已被禁用，请联系运营",
    AUTH_RATE_LIMITED: "尝试过于频繁，请稍后再试",
    RESOURCE_NOT_FOUND: "资源不存在",
    RESOURCE_IN_USE: "有作品正在使用该素材，无法删除",
    RESOURCE_BUSY: "该素材已有进行中的任务，请稍候",
    RESOURCE_STATE_INVALID: "当前状态不允许该操作",
    MEDIA_TYPE_UNSUPPORTED: "文件格式不支持",
    MEDIA_TOO_LARGE: "文件超过体积上限",
    MEDIA_DURATION_TOO_SHORT: "文件时长不足",
    MEDIA_DURATION_TOO_LONG: "文件时长超限",
    MEDIA_PROBE_FAILED: "无法解析媒体信息，请检查文件是否损坏",
    MEDIA_SIGNATURE_INVALID: "媒体链接已失效，请刷新后重试",
    SHARE_NOT_FOUND: "分享链接已失效",
    AI_SERVICE_UNAVAILABLE: "AI 服务暂不可用，请稍后重试",
    AI_SERVICE_ERROR: "AI 服务返回异常，请稍后重试",
    AI_REQUEST_REJECTED: "AI 服务拒绝了该输入",
    AI_RESPONSE_INVALID: "AI 服务响应格式异常",
    AI_RESULT_MISSING: "AI 产物缺失，请重试",
    STORAGE_PATH_INVALID: "存储路径异常，请联系支持",
    INTERNAL_ERROR: "服务内部错误，请稍后重试",
    JOB_TIMEOUT: "任务执行超时",
    JOB_INTERRUPTED: "任务被中断",
    SOURCE_FILE_MISSING: "源文件缺失",
    RATE_LIMITED: "请求过于频繁",
}

DEFAULT_STATUS: dict[str, int] = {
    VALIDATION_ERROR: 422,
    AUTH_INVALID_CREDENTIALS: 401,
    AUTH_EMAIL_TAKEN: 409,
    AUTH_WEAK_PASSWORD: 422,
    AUTH_PASSWORD_UNCHANGED: 422,
    AUTH_TOKEN_INVALID: 401,
    AUTH_TOKEN_EXPIRED: 401,
    AUTH_ACCOUNT_DISABLED: 403,
    AUTH_RATE_LIMITED: 429,
    RESOURCE_NOT_FOUND: 404,
    RESOURCE_IN_USE: 409,
    RESOURCE_BUSY: 409,
    RESOURCE_STATE_INVALID: 409,
    MEDIA_TYPE_UNSUPPORTED: 415,
    MEDIA_TOO_LARGE: 413,
    MEDIA_DURATION_TOO_SHORT: 422,
    MEDIA_DURATION_TOO_LONG: 422,
    MEDIA_PROBE_FAILED: 422,
    MEDIA_SIGNATURE_INVALID: 403,
    SHARE_NOT_FOUND: 404,
    AI_SERVICE_UNAVAILABLE: 503,
    AI_SERVICE_ERROR: 502,
    AI_REQUEST_REJECTED: 422,
    AI_RESPONSE_INVALID: 502,
    AI_RESULT_MISSING: 502,
    STORAGE_PATH_INVALID: 500,
    INTERNAL_ERROR: 500,
    JOB_TIMEOUT: 504,
    JOB_INTERRUPTED: 500,
    SOURCE_FILE_MISSING: 500,
    RATE_LIMITED: 429,
}

# 可重试错误码：任务层按退避重试（见设计_生成任务与队列 §六）
RETRYABLE_CODES = frozenset(
    {
        AI_SERVICE_UNAVAILABLE,
        AI_SERVICE_ERROR,
        AI_RESPONSE_INVALID,
        AI_RESULT_MISSING,
        JOB_TIMEOUT,
        JOB_INTERRUPTED,
    }
)


class AppError(Exception):
    """业务异常：code + 面向用户的中文 message + HTTP 状态。"""

    def __init__(
        self,
        code: str,
        message: str | None = None,
        status: int | None = None,
        fields: Iterable[dict[str, str]] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.code = code
        self.message = message or MESSAGES.get(code, "请求失败")
        self.status = status or DEFAULT_STATUS.get(code, 400)
        self.fields = list(fields or [])
        self.headers = headers or {}
        super().__init__(f"{code}: {self.message}")

    def to_payload(self, request_id: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.fields:
            payload["fields"] = self.fields
        if request_id:
            payload["request_id"] = request_id
        return payload

    @property
    def retryable(self) -> bool:
        return self.code in RETRYABLE_CODES


def not_found(message: str | None = None) -> AppError:
    """跨用户访问与资源不存在统一口径：404 RESOURCE_NOT_FOUND。"""
    return AppError(RESOURCE_NOT_FOUND, message)


def invalid_state(message: str | None = None) -> AppError:
    return AppError(RESOURCE_STATE_INVALID, message)


def validation_error(field: str, message: str) -> AppError:
    return AppError(VALIDATION_ERROR, "提交内容不合法", fields=[{"field": field, "message": message}])
