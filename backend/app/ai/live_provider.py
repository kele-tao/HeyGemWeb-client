"""真实模式：httpx.AsyncClient 调 TTS / Face2Face。

错误映射：连接失败/超时 → AI_SERVICE_UNAVAILABLE；上游 5xx → AI_SERVICE_ERROR；
上游 4xx → AI_REQUEST_REJECTED；结构不符 → AI_RESPONSE_INVALID。
HTTP 客户端不做自己的重试（重试只在任务层）。
"""

from __future__ import annotations

import time
from pathlib import Path

import httpx

from ..errors import (
    AppError,
    AI_REQUEST_REJECTED,
    AI_RESPONSE_INVALID,
    AI_SERVICE_ERROR,
    AI_SERVICE_UNAVAILABLE,
)
from ..utils import logger
from .base import F2FResult, PreprocessResult

CONNECT_TIMEOUT = 5.0
READ_TIMEOUT = 30.0
LONG_TIMEOUT = 120.0


class LiveProvider:
    name = "live"
    mode = "live"

    def __init__(self, settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(READ_TIMEOUT, connect=CONNECT_TIMEOUT),
                limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _request(self, method: str, url: str, **kwargs):
        timeout = kwargs.pop("timeout", None)
        start = time.perf_counter()
        try:
            response = await self.client.request(method, url, timeout=timeout, **kwargs)
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.RemoteProtocolError) as exc:
            logger.warning("AI 服务不可达 url=%s err=%s", url, exc)
            raise AppError(AI_SERVICE_UNAVAILABLE) from exc
        except httpx.HTTPError as exc:  # pragma: no cover - 网络环境相关
            logger.warning("AI 请求失败 url=%s err=%s", url, exc)
            raise AppError(AI_SERVICE_UNAVAILABLE) from exc
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(
            "AI %s %s -> %s %.0fms", method, url, response.status_code, elapsed
        )
        if response.status_code >= 500:
            raise AppError(AI_SERVICE_ERROR)
        if response.status_code >= 400:
            logger.warning("AI 4xx body=%s", response.text[:500])
            raise AppError(AI_REQUEST_REJECTED)
        return response

    async def preprocess_voice(self, handoff_filename: str) -> PreprocessResult:
        url = f"{self.settings.tts_base_url.rstrip('/')}/v1/preprocess_and_tran"
        payload = {"format": "wav", "reference_audio": handoff_filename, "lang": "zh"}
        response = await self._request("POST", url, json=payload, timeout=LONG_TIMEOUT)
        try:
            data = response.json()
        except ValueError as exc:
            raise AppError(AI_RESPONSE_INVALID) from exc
        asr_url = data.get("asr_format_audio_url") or handoff_filename
        reference_text = data.get("reference_audio_text") or ""
        # 外部可能返回绝对路径：只取文件名，重新映射到 handoff，绝不把外部路径写库
        reference_filename = Path(str(asr_url).replace("\\", "/")).name or handoff_filename
        if not reference_text:
            raise AppError(AI_RESPONSE_INVALID)
        return PreprocessResult(reference_filename=reference_filename, reference_text=reference_text)

    async def synthesize_speech(
        self, text: str, reference_filename: str, reference_text: str
    ) -> bytes:
        url = f"{self.settings.tts_base_url.rstrip('/')}/v1/invoke"
        payload = {
            "speaker": "heygem",
            "text": text,
            "format": "wav",
            "topP": 0.7,
            "max_new_tokens": 1024,
            "chunk_length": 100,
            "repetition_penalty": 1.2,
            "temperature": 0.7,
            "need_asr": False,
            "streaming": False,
            "is_fixed_seed": 0,
            "is_norm": 0,
            "reference_audio": reference_filename,
            "reference_text": reference_text,
        }
        response = await self._request("POST", url, json=payload, timeout=LONG_TIMEOUT)
        content = response.content
        if not content:
            raise AppError(AI_RESPONSE_INVALID)
        return content

    async def f2f_submit(self, audio_filename: str, video_filename: str, code: str) -> None:
        url = f"{self.settings.f2f_base_url.rstrip('/')}/easy/submit"
        payload = {
            "audio_url": audio_filename,
            "video_url": video_filename,
            "code": code,
            "chaofen": 0,
            "watermark_switch": 0,
            "pn": 1,
        }
        await self._request("POST", url, json=payload, timeout=READ_TIMEOUT)

    async def f2f_query(self, code: str) -> F2FResult:
        url = f"{self.settings.f2f_base_url.rstrip('/')}/easy/query"
        response = await self._request("GET", url, params={"code": code}, timeout=READ_TIMEOUT)
        try:
            body = response.json()
        except ValueError as exc:
            raise AppError(AI_RESPONSE_INVALID) from exc
        data = body.get("data") if isinstance(body, dict) else None
        if not isinstance(data, dict):
            raise AppError(AI_RESPONSE_INVALID)
        try:
            status = int(data.get("status"))
        except (TypeError, ValueError) as exc:
            raise AppError(AI_RESPONSE_INVALID) from exc
        return F2FResult(
            status=status,
            message=str(data.get("msg") or ""),
            result_rel_path=data.get("result"),
        )

    async def probe_services(self) -> dict[str, str]:
        result: dict[str, str] = {}
        for key, base in (
            ("tts", self.settings.tts_base_url),
            ("f2f", self.settings.f2f_base_url),
        ):
            try:
                await self.client.get(base, timeout=2.0)
                result[key] = "up"
            except httpx.HTTPError:
                result[key] = "down"
            except Exception:  # pragma: no cover
                result[key] = "unknown"
        result["asr"] = "unknown"
        return result
