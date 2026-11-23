"""受保护媒体二进制端点：短时签名 URL + Range 支持。

签名内容 kind|resource_id|user_id|exp，HMAC-SHA256；无效/过期统一 403。
"""

from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..errors import AppError, MEDIA_SIGNATURE_INVALID, not_found
from ..models import AuditionCache, Avatar, User, Video, Voice
from ..security import decode_access_token
from ..storage import Storage, content_type_for
from .deps import db_session, get_storage

router = APIRouter(prefix="/api/media", tags=["media"])

SAFE_NAME = re.compile(r"[^\w\u4e00-\u9fff\-]+")


def _download_name(title: str, video_id: str) -> str:
    cleaned = SAFE_NAME.sub("_", title or "HeyGem")[:30] or "HeyGem"
    return f"HeyGem_{cleaned}_{video_id[:8]}.mp4"


async def _entry_for(
    session: AsyncSession, kind: str, resource_id: str
) -> tuple[str | None, str | None, str | None]:
    """返回 (相对路径, 归属用户, 下载文件名/None)。"""
    if kind == "avatar-video":
        row = await session.get(Avatar, resource_id)
        return (row.source_rel_path, row.user_id, None) if row else (None, None, None)
    if kind == "avatar-thumb":
        row = await session.get(Avatar, resource_id)
        return (row.thumb_rel_path, row.user_id, None) if row else (None, None, None)
    if kind == "voice-sample":
        row = await session.get(Voice, resource_id)
        return (row.sample_rel_path, row.user_id, None) if row else (None, None, None)
    if kind == "audition":
        cache = await session.get(AuditionCache, resource_id)
        if cache is None:
            return (None, None, None)
        return (cache.audio_rel_path, cache.user_id, None)
    if kind in ("video-thumb", "video-stream", "video-download"):
        row = await session.get(Video, resource_id)
        if row is None:
            return (None, None, None)
        if kind == "video-thumb":
            return (row.thumb_rel_path, row.user_id, None)
        if row.status != "success":
            return (None, row.user_id, None)
        name = _download_name(row.title, row.id) if kind == "video-download" else None
        return (row.output_rel_path, row.user_id, name)
    return (None, None, None)


def _optional_user_from_auth(request: Request) -> str | None:
    """归属校验辅助：签名里带 user_id；若请求同时带 Bearer，也接受其用户。"""
    header = request.headers.get("authorization") or ""
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    settings = request.app.state.settings
    try:
        return decode_access_token(settings, token)["sub"]
    except AppError:
        return None


@router.get("/{kind}/{resource_id}")
async def get_media(
    kind: str,
    resource_id: str,
    request: Request,
    exp: str | None = Query(default=None),
    sig: str | None = Query(default=None),
    session: AsyncSession = Depends(db_session),
) -> FileResponse:
    allowed = {
        "avatar-video",
        "avatar-thumb",
        "voice-sample",
        "audition",
        "video-thumb",
        "video-stream",
        "video-download",
    }
    if kind not in allowed:
        raise not_found()
    storage: Storage = get_storage(request)

    rel_path, owner_id, download_name = await _entry_for(session, kind, resource_id)
    # 签名绑定用户上下文：先按签名参数校验，再核对记录归属
    storage.verify_signature(kind, resource_id, owner_id, exp, sig)
    if not rel_path:
        raise not_found()
    path = storage.resolve(rel_path)
    if not path.exists():
        raise not_found()

    headers = {"Cache-Control": "private, max-age=3600", "Accept-Ranges": "bytes"}
    media_type = content_type_for(path)
    if kind == "video-download" and download_name:
        return FileResponse(
            path,
            media_type=media_type,
            headers=headers,
            filename=download_name,
            content_disposition_type="attachment",
        )
    if kind.startswith("video"):
        return FileResponse(
            path,
            media_type=media_type,
            headers=headers,
            content_disposition_type="inline",
        )
    return FileResponse(path, media_type=media_type, headers=headers)
