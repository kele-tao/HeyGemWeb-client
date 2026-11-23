"""配置装载与启动期守卫。

配置来源：环境变量（前缀 HEYGEM_）+ 可选 .env。
启动期校验（见设计_文件存储与运行配置.md §六）：
- 目录可写、ffprobe 可用；
- 生产环境禁 mock 守卫（除非显式 ALLOW_MOCK_IN_PRODUCTION）。
"""

from __future__ import annotations

import logging
import shutil
import stat
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .errors import AppError, INTERNAL_ERROR
from .utils import logger

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """全部运行期配置。字段名去掉 HEYGEM_ 前缀后小写。"""

    model_config = SettingsConfigDict(
        env_prefix="HEYGEM_",
        env_file=(BACKEND_ROOT / ".env", BACKEND_ROOT.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = "development"
    data_root: str = "./data"
    database_url: str = ""
    jwt_secret: str = ""
    access_token_ttl_seconds: int = 7200
    refresh_token_ttl_days: int = 30
    media_url_ttl_seconds: int = 21600
    cors_origins: str = "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173"
    ai_mode: str = "live"
    allow_mock_in_production: bool = False
    tts_base_url: str = "http://127.0.0.1:18180"
    tts_handoff_dir: str = ""
    f2f_base_url: str = "http://127.0.0.1:8383"
    f2f_handoff_dir: str = ""
    asr_base_url: str = "http://127.0.0.1:10095"
    f2f_poll_interval_seconds: float = 3.0
    worker_enabled: bool = True
    worker_concurrency: int = 1
    job_max_attempts: int = 3
    job_retry_backoff_seconds: str = "10,60,300"
    job_timeout_avatar_seconds: int = 180
    job_timeout_voice_seconds: int = 300
    job_timeout_video_seconds: int = 1800
    job_lease_seconds: int = 120
    job_lease_heartbeat_seconds: int = 30
    max_avatar_bytes: int = 524_288_000
    max_audio_bytes: int = 209_715_200
    mock_delay_factor: float = 1.0
    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 8000

    @field_validator("app_env")
    @classmethod
    def _check_env(cls, v: str) -> str:
        v = (v or "development").strip().lower()
        if v not in {"development", "production", "test"}:
            raise ValueError("HEYGEM_APP_ENV 只能为 development / production / test")
        return v

    @field_validator("ai_mode")
    @classmethod
    def _check_ai_mode(cls, v: str) -> str:
        v = (v or "live").strip().lower()
        if v not in {"live", "mock"}:
            raise ValueError("HEYGEM_AI_MODE 只能为 live / mock")
        return v

    # ------------------------------------------------------------ 派生路径
    @property
    def data_root_path(self) -> Path:
        p = Path(self.data_root)
        if not p.is_absolute():
            p = (BACKEND_ROOT / p).resolve()
        return p

    @property
    def mock_assets_dir(self) -> Path:
        return BACKEND_ROOT / "assets" / "mock"

    @property
    def db_path(self) -> Path:
        return self.data_root_path / "db" / "app.db"

    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite+aiosqlite:///{(self.db_path).as_posix()}"

    @property
    def tts_handoff_path(self) -> Path:
        return Path(self.tts_handoff_dir) if self.tts_handoff_dir else self.data_root_path / "handoff" / "tts"

    @property
    def f2f_handoff_path(self) -> Path:
        return Path(self.f2f_handoff_dir) if self.f2f_handoff_dir else self.data_root_path / "handoff" / "f2f"

    @property
    def secret_key_path(self) -> Path:
        return self.data_root_path / ".secret_key"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def backoff_sequence(self) -> list[float]:
        out: list[float] = []
        for part in self.job_retry_backoff_seconds.split(","):
            part = part.strip()
            if not part:
                continue
            try:
                out.append(float(part))
            except ValueError:
                continue
        return out or [10.0, 60.0, 300.0]

    def job_timeout(self, kind: str) -> int:
        if kind == "avatar_prepare":
            return self.job_timeout_avatar_seconds
        if kind == "voice_train":
            return self.job_timeout_voice_seconds
        return self.job_timeout_video_seconds

    # ------------------------------------------------------------ 目录
    def ensure_dirs(self) -> None:
        root = self.data_root_path
        for sub in ("db", "users", "handoff/tts", "handoff/f2f", "cache/auditions", "tmp"):
            (root / sub).mkdir(parents=True, exist_ok=True)
        self.tts_handoff_path.mkdir(parents=True, exist_ok=True)
        self.f2f_handoff_path.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------ 密钥
    def load_secret(self) -> str:
        """JWT 密钥：环境变量 > 本地持久化文件 > 随机生成并落盘（权限 600）。"""
        if self.jwt_secret:
            return self.jwt_secret
        if self.app_env == "production":
            raise RuntimeError(
                "生产环境必须设置 HEYGEM_JWT_SECRET（拒绝使用默认/随机密钥）"
            )
        path = self.secret_key_path
        if path.exists():
            value = path.read_text(encoding="utf-8").strip()
            if value:
                return value
        import secrets

        value = secrets.token_urlsafe(48)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value, encoding="utf-8")
        try:
            path.chmod(stat.S_IRUSR | stat.S_IWUSR)
        except OSError:  # Windows 上 chmod 语义有限，忽略
            pass
        logger.warning("未配置 HEYGEM_JWT_SECRET，已生成随机密钥并保存到 %s", path)
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def reset_settings_cache() -> None:
    get_settings.cache_clear()


def _configure_logging(settings: Settings) -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    logger.setLevel(level)


def run_startup_guards(settings: Settings) -> None:
    """启动期守卫：任何一项不满足即拒绝启动（不带病运行）。"""
    _configure_logging(settings)
    settings.ensure_dirs()

    # 目录可写
    probe = settings.data_root_path / "tmp" / ".write_probe"
    try:
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
    except OSError as exc:  # pragma: no cover - 环境相关
        raise RuntimeError(f"启动校验：数据目录不可写 {settings.data_root_path} ({exc})") from exc

    # ffprobe 可用（跳过校验等于接受任意文件，必须启动期失败）
    if shutil.which("ffprobe") is None and settings.app_env != "test":
        raise RuntimeError(
            "启动校验：ffprobe not found。请安装 ffmpeg 并确保 ffprobe 在 PATH 中"
        )

    # 生产禁 mock 守卫
    if settings.app_env == "production" and settings.ai_mode == "mock":
        if not settings.allow_mock_in_production:
            raise RuntimeError(
                "启动校验：生产环境禁止 HEYGEM_AI_MODE=mock。"
                "如确需演示，请显式设置 HEYGEM_ALLOW_MOCK_IN_PRODUCTION=true"
            )
        logger.warning("!!! 生产环境正在使用模拟模式（HEYGEM_AI_MODE=mock），产物为占位视频 !!!")
    elif settings.ai_mode == "mock":
        logger.warning("模拟模式已启用（HEYGEM_AI_MODE=mock）：AI 产物为内置占位素材")

    # mock 占位素材必须存在
    if settings.ai_mode == "mock":
        for name in ("sample.wav", "sample.mp4", "thumb.jpg"):
            f = settings.mock_assets_dir / name
            if not f.exists() or f.stat().st_size == 0:
                raise RuntimeError(f"启动校验：模拟模式缺少占位素材 {f}")

    logger.info(
        "启动配置 app_env=%s ai_mode=%s data_root=%s",
        settings.app_env,
        settings.ai_mode,
        settings.data_root_path,
    )
