"""试听缓存与语音合成（请求内直调，不进队列）。"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..ai.base import AIProvider
from ..config import Settings
from ..errors import AI_RESULT_MISSING, invalid_state
from ..models import AuditionCache, Voice
from ..storage import Storage
from ..utils import new_id, text_hash, utcnow


async def ensure_voice_ready(session: AsyncSession, user_id: str, voice_id: str) -> Voice:
    from .voice_service import get_voice

    voice = await get_voice(session, user_id, voice_id)
    if voice.status != "complete":
        raise invalid_state("声音尚未就绪，请等待训练完成")
    return voice


async def audition(
    session: AsyncSession,
    settings: Settings,
    storage: Storage,
    provider: AIProvider,
    user_id: str,
    voice: Voice,
    text: str,
) -> tuple[AuditionCache, bool]:
    digest = text_hash(text)
    cached = await session.scalar(
        select(AuditionCache).where(
            AuditionCache.voice_id == voice.id,
            AuditionCache.text_hash == digest,
        )
    )
    if cached is not None and storage.resolve(cached.audio_rel_path).exists():
        return cached, True

    audio = await provider.synthesize_speech(
        text, voice.asr_rel_path or "", voice.reference_text or ""
    )
    if not audio:
        raise AI_RESULT_MISSING
    rel_dir = Storage.audition_dir(user_id, voice.id)
    storage.ensure_dir(rel_dir)
    rel_path = f"{rel_dir}/{digest}.wav"
    storage.atomic_write_bytes(rel_path, audio)
    if cached is None:
        cached = AuditionCache(
            id=new_id(),
            user_id=user_id,
            voice_id=voice.id,
            text_hash=digest,
            text_content=text,
            audio_rel_path=rel_path,
            created_at=utcnow(),
        )
        session.add(cached)
    else:
        cached.audio_rel_path = rel_path
    await session.flush()
    return cached, False


async def speech(
    provider: AIProvider, voice: Voice, text: str
) -> bytes:
    audio = await provider.synthesize_speech(
        text, voice.asr_rel_path or "", voice.reference_text or ""
    )
    if not audio:
        raise AI_RESULT_MISSING
    return audio
