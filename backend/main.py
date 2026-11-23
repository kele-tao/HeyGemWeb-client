"""应用入口（部署脚本与本地启动都引用本文件，保持不变）。

真正的应用装配在 app/main.py：create_app() + lifespan + 统一异常处理。
本地：python main.py    （等价 uvicorn main:app）
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app, create_app  # noqa: E402

__all__ = ["app", "create_app"]


def main() -> None:
    import uvicorn

    from app.config import get_settings

    settings = get_settings()
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
