"""HTTP 入口：路由、入参校验、鉴权依赖、归属校验入口。不写业务规则。"""

from . import auth, avatars, bootstrap, media, share, system, videos, voices

ROUTERS = (
    system.router,
    auth.router,
    bootstrap.router,
    avatars.router,
    voices.router,
    videos.router,
    media.router,
    share.router,
)

__all__ = ["ROUTERS"]
