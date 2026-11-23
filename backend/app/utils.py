"""通用小工具：UTC 时间、ID、文本哈希、日志辅助。"""

from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("heygem")


def utcnow() -> datetime:
    """当前 UTC 时间（naive，与数据库存储口径一致）。"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_id() -> str:
    """UUIDv4 字符串主键。"""
    return str(uuid.uuid4())


def text_hash(text: str) -> str:
    """归一化文本的 SHA-256（试听缓存键）。"""
    normalized = " ".join(text.split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def mask_email(email: str) -> str:
    """日志脱敏：ke***@example.com。"""
    if "@" not in email:
        return "***"
    local, _, domain = email.partition("@")
    return f"{local[:2]}***@{domain}"


def log_event(event: str, **fields: object) -> None:
    """结构化日志：event 后接 key=value。"""
    payload = " ".join(f"{k}={v}" for k, v in fields.items() if v is not None)
    logger.info("%s %s", event, payload) if payload else logger.info("%s", event)
