"""声音 CRUD、试听与语音合成。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..schemas.misc import AuditionRequest, RenameRequest, TextRequest
from ..schemas.resource import AuditionOut, VoiceOut
from ..security import CurrentAuth
from ..services import audition_service, voice_service
from ..storage import Storage
from .deps import db_session, get_provider, get_serializer, get_storage, parse_limit, parse_status_filter

router = APIRouter(prefix="/api/voices", tags=["voices"])

MAX_SPEECH_CHARS = 2000


@router.get("", response_model=list[VoiceOut])
async def list_voices(
    ctx: CurrentAuth,
    request: Request,
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(db_session),
) -> list[VoiceOut]:
    rows = await voice_service.list_voices(
        session, ctx.user_id, parse_status_filter(status_filter), parse_limit(limit), offset
    )
    serializer = get_serializer(request)
    return [serializer.voice(r) for r in rows]


@router.post("", response_model=VoiceOut, status_code=status.HTTP_201_CREATED)
async def create_voice(
    ctx: CurrentAuth,
    request: Request,
    name: str = Form(...),
    audio_file: UploadFile = File(...),
    session: AsyncSession = Depends(db_session),
) -> VoiceOut:
    storage: Storage = get_storage(request)
    settings = request.app.state.settings
    row = await voice_service.create_voice(
        session, settings, storage, ctx.user_id, name, audio_file, audio_file.filename or "audio.wav"
    )
    await session.commit()
    return get_serializer(request).voice(row)


@router.get("/{voice_id}", response_model=VoiceOut)
async def get_voice(
    voice_id: str,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> VoiceOut:
    row = await voice_service.get_voice(session, ctx.user_id, voice_id)
    return get_serializer(request).voice(row)


@router.patch("/{voice_id}", response_model=VoiceOut)
async def rename_voice(
    voice_id: str,
    payload: RenameRequest,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> VoiceOut:
    row = await voice_service.rename_voice(session, ctx.user_id, voice_id, payload.name)
    await session.commit()
    return get_serializer(request).voice(row)


@router.delete("/{voice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voice(
    voice_id: str,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> Response:
    storage: Storage = get_storage(request)
    rel_dir = await voice_service.delete_voice(session, storage, ctx.user_id, voice_id)
    await session.commit()
    storage.delete_tree(rel_dir)
    storage.delete_tree(Storage.audition_dir(ctx.user_id, voice_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{voice_id}/audition", response_model=AuditionOut)
async def audition_voice(
    voice_id: str,
    payload: AuditionRequest,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> AuditionOut:
    storage: Storage = get_storage(request)
    provider = get_provider(request)
    settings = request.app.state.settings
    voice = await audition_service.ensure_voice_ready(session, ctx.user_id, voice_id)
    cache, hit = await audition_service.audition(
        session, settings, storage, provider, ctx.user_id, voice, payload.text
    )
    url = storage.sign("audition", cache.id, ctx.user_id)
    await session.commit()
    return AuditionOut(url=url, cached=hit)


@router.post("/{voice_id}/speech")
async def synthesize_speech(
    voice_id: str,
    payload: TextRequest,
    ctx: CurrentAuth,
    request: Request,
    session: AsyncSession = Depends(db_session),
) -> Response:
    provider = get_provider(request)
    if len(payload.text) > MAX_SPEECH_CHARS:
        from ..errors import validation_error

        raise validation_error("text", f"文本不能超过 {MAX_SPEECH_CHARS} 个字符")
    voice = await audition_service.ensure_voice_ready(session, ctx.user_id, voice_id)
    audio = await audition_service.speech(provider, voice, payload.text)
    return Response(content=audio, media_type="audio/wav")