"""系统状态：公开探活与 AI 服务可达性。"""

from __future__ import annotations

import time

from fastapi import APIRouter, Request

from .. import __version__
from ..schemas.resource import SystemStatusOut

router = APIRouter(prefix="/api/system", tags=["system"])

_CACHE_TTL = 15.0


@router.get("/status", response_model=SystemStatusOut)
async def system_status(request: Request) -> SystemStatusOut:
    settings = request.app.state.settings
    provider = request.app.state.provider
    cache = request.app.state.service_status_cache

    now = time.time()
    if not cache or now - cache.get("at", 0) > _CACHE_TTL:
        services = await provider.probe_services()
        cache.clear()
        cache.update({"at": now, "services": services})
    return SystemStatusOut(
        app_env=settings.app_env,
        ai_mode=settings.ai_mode,
        version=__version__,
        services=cache.get("services", {}),
    )
