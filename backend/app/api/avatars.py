"""数字人 CRUD 与媒体入口。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..schemas.misc import RenameRequest
from ..schemas.resource import AvatarOut
from ..security import CurrentAuth
from ..services import avatar_service
from ..storage import Storage
from .deps import db_session, get_serializer, get_storage, parse_limit, parse_status_filter

router = APIRouter(prefix="/api/avatars", tags=["avatars"])


@router.get("", response_model=list[AvatarOut])
async def list_avatars(
    ctx: CurrentAuth,
    request: Request,
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(db_session),
) -> list[AvatarOut]:
    rows = await avatar_service.list_avatars(
        session, ctx.user_id, parse_status_filter(status_filter), parse_limit(limit), offset
    )
    serializer = get_serializer(request)
    return [serializer.avatar(r) for r in rows]


@router.post("", response_model=AvatarOut, status_code=status.HTTP_201_CREATED)
async def create_avatar(
    ctx: CurrentAuth,
    request: Request,
    name: str = Form(...),
    video_file: UploadFile = File(...),
    session: AsyncSession = Depends(db_session),
) -> AvatarOut:
    storage: Storage = get_storage(request)
    settings = request.app.state.settings
    row = await avatar_service.create_avatar(
        session, settings, storage, ctx.user_id, name, video_file, video_file.filename or "video.mp4"
    )
    await session.commit()
    return get_serializer(request).avatar(row)


@router.get("/{avatar_id}", response_model=AvatarOut)
async def get_avatar(
    avatar_id: str,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> AvatarOut:
    row = await avatar_service.get_avatar(session, ctx.user_id, avatar_id)
    return get_serializer(request).avatar(row)


@router.patch("/{avatar_id}", response_model=AvatarOut)
async def rename_avatar(
    avatar_id: str,
    payload: RenameRequest,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> AvatarOut:
    row = await avatar_service.rename_avatar(session, ctx.user_id, avatar_id, payload.name)
    await session.commit()
    return get_serializer(request).avatar(row)


@router.delete("/{avatar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avatar(
    avatar_id: str,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> Response:
    storage: Storage = get_storage(request)
    rel_dir = await avatar_service.delete_avatar(session, storage, ctx.user_id, avatar_id)
    await session.commit()
    storage.delete_tree(rel_dir)
    return Response(status_code=status.HTTP_204_NO_CONTENT)