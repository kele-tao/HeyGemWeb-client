"""首屏聚合：用户 + 三类资源 + 统计 + 服务模式。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from .. import __version__
from ..schemas.resource import BootstrapOut, ServerInfo, StatsOut
from ..security import CurrentAuth
from ..services import auth_service, avatar_service, video_service, voice_service
from .deps import db_session, get_serializer, request_base

router = APIRouter(prefix="/api/bootstrap", tags=["bootstrap"])


@router.get("", response_model=BootstrapOut)
async def bootstrap(
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> BootstrapOut:
    serializer = get_serializer(request)
    settings = request.app.state.settings
    base = request_base(request)
    avatars = await avatar_service.list_avatars(session, ctx.user_id, [], 200, 0)
    voices = await voice_service.list_voices(session, ctx.user_id, [], 200, 0)
    videos = await video_service.list_videos(session, ctx.user_id, [], None, 200, 0)
    positions = await video_service.queue_positions(session, videos)
    stats = await video_service.stats(session, ctx.user_id)
    return BootstrapOut(
        user=auth_service.user_out(ctx.user),
        avatars=[serializer.avatar(a) for a in avatars],
        voices=[serializer.voice(v) for v in voices],
        videos=[
            serializer.video(v, queue_position=positions.get(v.id), request_base=base)
            for v in videos
        ],
        stats=StatsOut(**stats),
        server=ServerInfo(
            ai_mode=settings.ai_mode, app_env=settings.app_env, version=__version__
        ),
    )
