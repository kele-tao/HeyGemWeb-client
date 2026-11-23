"""作品 CRUD、重试、批量进度与分享。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..errors import validation_error
from ..schemas.misc import RenameTitleRequest
from ..schemas.resource import ShareOut, VideoOut, VideoProgressOut
from ..security import CurrentAuth
from ..services import video_service
from ..storage import Storage
from .deps import (
    db_session,
    get_serializer,
    get_storage,
    parse_limit,
    parse_status_filter,
    request_base,
)

router = APIRouter(prefix="/api/videos", tags=["videos"])


@router.get("", response_model=list[VideoOut])
async def list_videos(
    ctx: CurrentAuth,
    request: Request,
    status_filter: str | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(db_session),
) -> list[VideoOut]:
    rows = await video_service.list_videos(
        session, ctx.user_id, parse_status_filter(status_filter), q, parse_limit(limit), offset
    )
    positions = await video_service.queue_positions(session, rows)
    serializer = get_serializer(request)
    base = request_base(request)
    return [
        serializer.video(r, queue_position=positions.get(r.id), request_base=base) for r in rows
    ]


@router.get("/progress", response_model=list[VideoProgressOut])
async def batch_progress(
    ctx: CurrentAuth,
    request: Request,
    ids: str = Query(default=""),
    session: AsyncSession = Depends(db_session),
) -> list[VideoProgressOut]:
    id_list = [i.strip() for i in ids.split(",") if i.strip()][:50]
    rows = await video_service.progress_map(session, ctx.user_id, id_list)
    positions = await video_service.queue_positions(session, rows)
    serializer = get_serializer(request)
    base = request_base(request)
    return [
        serializer.video_progress(r, queue_position=positions.get(r.id), request_base=base)
        for r in rows
    ]


@router.post("", response_model=VideoOut, status_code=status.HTTP_201_CREATED)
async def create_video(
    ctx: CurrentAuth,
    request: Request,
    title: str = Form(...),
    avatar_id: str = Form(...),
    audio_file: UploadFile = File(...),
    voice_id: str | None = Form(default=None),
    script: str | None = Form(default=None),
    category: str | None = Form(default=None),
    session: AsyncSession = Depends(db_session),
) -> VideoOut:
    storage: Storage = get_storage(request)
    settings = request.app.state.settings
    if category and len(category) > 32:
        raise validation_error("category", "分类不能超过 32 个字符")
    row = await video_service.create_video(
        session,
        settings,
        storage,
        ctx.user_id,
        title=title,
        avatar_id=avatar_id,
        voice_id=voice_id or None,
        script=script,
        category=category,
        upload_file=audio_file,
        filename=audio_file.filename or "audio.wav",
    )
    positions = await video_service.queue_positions(session, [row])
    payload = get_serializer(request).video(
        row, queue_position=positions.get(row.id), request_base=request_base(request)
    )
    await session.commit()
    return payload


@router.get("/{video_id}", response_model=VideoOut)
async def get_video(
    video_id: str,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> VideoOut:
    row = await video_service.get_video(session, ctx.user_id, video_id)
    positions = await video_service.queue_positions(session, [row])
    return get_serializer(request).video(
        row, queue_position=positions.get(row.id), request_base=request_base(request)
    )


@router.patch("/{video_id}", response_model=VideoOut)
async def rename_video(
    video_id: str,
    payload: RenameTitleRequest,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> VideoOut:
    row = await video_service.rename_video(session, ctx.user_id, video_id, payload.title)
    out = get_serializer(request).video(row, request_base=request_base(request))
    await session.commit()
    return out


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: str,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> Response:
    storage: Storage = get_storage(request)
    rel_dir = await video_service.delete_video(session, storage, ctx.user_id, video_id)
    await session.commit()
    storage.delete_tree(rel_dir)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{video_id}/retry", response_model=VideoOut, status_code=status.HTTP_202_ACCEPTED)
async def retry_video(
    video_id: str,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> VideoOut:
    settings = request.app.state.settings
    row = await video_service.retry_video(session, settings, ctx.user_id, video_id)
    positions = await video_service.queue_positions(session, [row])
    out = get_serializer(request).video(
        row, queue_position=positions.get(row.id), request_base=request_base(request)
    )
    await session.commit()
    return out


@router.post("/{video_id}/share", response_model=ShareOut)
async def create_share(
    video_id: str,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> ShareOut:
    token = await video_service.share_video(session, ctx.user_id, video_id)
    base = request_base(request)
    out = ShareOut(
        share_token=token, share_url=f"{base}/api/share/{token}" if base else f"/api/share/{token}"
    )
    await session.commit()
    return out


@router.delete("/{video_id}/share", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share(
    video_id: str,
    ctx: CurrentAuth,
    session: AsyncSession = Depends(db_session),
) -> Response:
    await video_service.revoke_share(session, ctx.user_id, video_id)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)