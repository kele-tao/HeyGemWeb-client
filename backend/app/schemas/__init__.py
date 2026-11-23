"""对外 JSON 结构（请求/响应），与表结构解耦。"""

from .auth import (
    AuthResponse,
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from .resource import (
    AvatarOut,
    BootstrapOut,
    ServerInfo,
    ShareOut,
    StatsOut,
    VideoOut,
    VideoProgressOut,
    VoiceOut,
    AuditionOut,
)

__all__ = [
    "AuthResponse",
    "ChangePasswordRequest",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "UserOut",
    "AvatarOut",
    "BootstrapOut",
    "ServerInfo",
    "ShareOut",
    "StatsOut",
    "VideoOut",
    "VideoProgressOut",
    "VoiceOut",
    "AuditionOut",
]
