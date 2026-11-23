"""应用装配与启动入口（保留 main.py 文件名，部署脚本引用不变）。

启动顺序（见 00_全局后端架构.md §六）：
装载配置 → 启动期守卫 → 引擎/会话工厂 → alembic upgrade head → 建目录 →
清 tmp → 回收过期任务 → 启动 worker。
停机：停 worker → 交还 running 任务 → 关连接池。
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from . import __version__
from .ai import build_provider
from .api import ROUTERS
from .config import Settings, get_settings, run_startup_guards
from .db import Database
from .errors import (
    AUTH_RATE_LIMITED,
    INTERNAL_ERROR,
    VALIDATION_ERROR,
    AppError,
)
from .jobs.handlers import build_handlers
from .jobs.queue import JobQueue, JobWorker
from .ratelimit import RateLimiter
from .security import get_settings_dep  # noqa: F401  (对外导出)
from .services.serializers import Serializer
from .storage import Storage
from .utils import log_event, logger, utcnow

REQUEST_ID_HEADER = "X-Request-Id"


def run_migrations(settings: Settings) -> None:
    """Alembic 单一迁移链：启动时 upgrade head（不另设 create_all）。"""
    from alembic import command
    from alembic.config import Config

    from .config import BACKEND_ROOT

    # 不读 alembic.ini（中文 Windows 下 configparser 用 GBK 读会炸），直接显式注入
    cfg = Config()
    cfg.set_main_option("script_location", (BACKEND_ROOT / "migrations").as_posix())
    cfg.set_main_option("prepend_sys_path", BACKEND_ROOT.as_posix())
    cfg.set_main_option("sqlalchemy.url", settings.effective_database_url)
    command.upgrade(cfg, "head")
    logger.info("数据库迁移完成")


async def recover_jobs(db: Database, settings: Settings) -> None:
    queue = JobQueue(db, settings, "startup-recovery")
    await queue.recover_expired()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings: Settings = get_settings()
    app.state.settings = settings
    run_startup_guards(settings)

    # 迁移（SQLite 自动建库；PostgreSQL 同一套脚本）
    # Alembic 内部用 asyncio.run()，必须放到线程里，不能在 lifespan 的事件循环内执行
    try:
        await asyncio.to_thread(run_migrations, settings)
    except Exception as exc:  # pragma: no cover - 迁移失败必须阻断启动
        logger.error("数据库迁移失败: %s", exc)
        raise

    db = Database(settings)
    app.state.db = db
    storage = Storage(settings)
    storage.clear_tmp()
    app.state.storage = storage

    provider = build_provider(settings)
    app.state.provider = provider
    app.state.serializer = Serializer(settings, storage)
    app.state.rate_limiter = RateLimiter()
    app.state.service_status_cache = {}

    await recover_jobs(db, settings)

    worker: JobWorker | None = None
    if settings.worker_enabled:
        queue = JobQueue(db, settings, f"{uuid.uuid4().hex[:8]}")
        handlers = build_handlers(db, settings, storage, provider)
        worker = JobWorker(queue, settings, handlers)
        await worker.start()
        app.state.worker = worker

    logger.info(
        "HeyGem v%s 启动完成 env=%s ai_mode=%s port=%s",
        __version__,
        settings.app_env,
        settings.ai_mode,
        settings.port,
    )
    try:
        yield
    finally:
        if worker is not None:
            await worker.stop()
            await worker.handover()
        aclose = getattr(provider, "aclose", None)
        if aclose:
            await aclose()
        await db.dispose()
        logger.info("服务已停止")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """request_id 回写响应头 + 结构化访问日志 + AI 模式标识。"""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex[:16]
        request.state.request_id = request_id
        start = asyncio.get_event_loop().time()
        response = await call_next(request)
        elapsed_ms = (asyncio.get_event_loop().time() - start) * 1000
        response.headers[REQUEST_ID_HEADER] = request_id
        settings = getattr(request.app.state, "settings", None)
        if settings is not None and settings.ai_mode == "mock":
            response.headers["X-HeyGem-Ai-Mode"] = "mock"
        log_event(
            "http",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            ms=f"{elapsed_ms:.0f}",
            request_id=request_id,
        )
        return response


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="HeyGem 商业版 API",
        version=__version__,
        description="数字人口播视频创作平台后端（多租户、任务队列、模拟模式）",
        lifespan=lifespan,
    )
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[REQUEST_ID_HEADER, "X-HeyGem-Ai-Mode"],
    )

    for router in ROUTERS:
        app.include_router(router)

    # -------------------------------------------------------- 统一异常处理
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=exc.status,
            content=exc.to_payload(request_id),
            headers=exc.headers or None,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        fields = []
        for err in exc.errors():
            loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
            fields.append(
                {
                    "field": ".".join(loc) or "body",
                    "message": err.get("msg", "格式不正确"),
                }
            )
        return JSONResponse(
            status_code=422,
            content={
                "code": VALIDATION_ERROR,
                "message": "提交内容不合法",
                "fields": fields,
                "request_id": request_id,
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        code = "RESOURCE_NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": code,
                "message": "资源不存在" if exc.status_code == 404 else str(exc.detail),
                "request_id": request_id,
            },
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        logger.exception("未处理异常 path=%s", request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "code": INTERNAL_ERROR,
                "message": "服务内部错误，请稍后重试",
                "request_id": request_id,
            },
        )

    @app.get("/healthz", tags=["system"])
    async def healthz() -> dict:
        return {"status": "ok", "version": __version__, "time": utcnow().isoformat()}

    return app


app = create_app()


def main() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower(),
        reload=False,
    )


if __name__ == "__main__":
    main()