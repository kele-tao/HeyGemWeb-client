"""进程内滑动窗口限流（单实例足够；多实例需换共享存储）。

见 设计_用户与鉴权.md §四 限流表。
"""

from __future__ import annotations

import time
from collections import deque

from .errors import AppError, AUTH_RATE_LIMITED


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = {}

    def check(self, key: str, limit: int, window: int) -> None:
        now = time.time()
        bucket = self._hits.setdefault(key, deque())
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= limit:
            retry_after = int(window - (now - bucket[0])) + 1
            raise AppError(
                AUTH_RATE_LIMITED,
                f"尝试过于频繁，请 {retry_after} 秒后再试",
                headers={"Retry-After": str(max(1, retry_after))},
            )
        bucket.append(now)

    def reset(self) -> None:
        self._hits.clear()
