"""分享链接：免登录播放单个作品，不暴露作者与其他资源。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..errors import AppError, SHARE_NOT_FOUND
from ..models import Video
from ..models.base import iso
from ..schemas.resource import ShareMetaOut
from ..storage import Storage, content_type_for
from .deps import db_session, get_storage

router = APIRouter(prefix="/api/share", tags=["share"])


async def _video_by_token(session: AsyncSession, token: str) -> Video:
    row = await session.scalar(select(Video).where(Video.share_token == token))
    if row is None or row.status != "success" or not row.output_rel_path:
        raise AppError(SHARE_NOT_FOUND)
    return row


@router.get("/{token}/meta", response_model=ShareMetaOut)
async def share_meta(token: str, session: AsyncSession = Depends(db_session)) -> ShareMetaOut:
    row = await _video_by_token(session, token)
    return ShareMetaOut(
        title=row.title, duration_ms=row.duration_ms, created_at=iso(row.created_at) or ""
    )


@router.get("/{token}")
async def share_stream(
    token: str,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> FileResponse:
    row = await _video_by_token(session, token)
    storage: Storage = get_storage(request)
    path = storage.resolve(row.output_rel_path)
    if not path.exists():
        raise AppError(SHARE_NOT_FOUND)
    return FileResponse(
        path,
        media_type=content_type_for(path),
        headers={"Accept-Ranges": "bytes", "Content-Disposition": "inline"},
    )
