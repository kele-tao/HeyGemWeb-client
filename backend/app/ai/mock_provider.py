"""模拟模式实现：只替换"AI 计算"，状态流转/队列/重试与真实模式一致。"""

from __future__ import annotations

import asyncio
import shutil
import uuid

from ..errors import AppError, AI_RESULT_MISSING
from ..utils import logger
from .base import F2FResult, PreprocessResult

MOCK_REFERENCE_TEXT = "这是模拟模式生成的参考文本，用于演示声音训练的完整链路。"
MOCK_RESULT_FILENAME = "mock_result.mp4"


class MockProvider:
    name = "mock"
    mode = "mock"

    def __init__(self, settings) -> None:
        self.settings = settings
        self.assets = settings.mock_assets_dir

    def _delay(self, seconds: float) -> float:
        return max(0.0, seconds * float(self.settings.mock_delay_factor or 1.0))

    @property
    def _sample_wav(self):
        return self.assets / "sample.wav"

    @property
    def _sample_mp4(self):
        return self.assets / "sample.mp4"

    async def preprocess_voice(self, handoff_filename: str) -> PreprocessResult:
        await asyncio.sleep(self._delay(2.0))
        target = self.settings.tts_handoff_path / f"ref_{handoff_filename}"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(self._sample_wav, target)
        logger.info("mock: 声音训练完成 reference=%s", target.name)
        return PreprocessResult(reference_filename=target.name, reference_text=MOCK_REFERENCE_TEXT)

    async def synthesize_speech(
        self, text: str, reference_filename: str, reference_text: str
    ) -> bytes:
        await asyncio.sleep(self._delay(0.6))
        return self._sample_wav.read_bytes()

    async def f2f_submit(self, audio_filename: str, video_filename: str, code: str) -> None:
        logger.info("mock: 提交视频合成 code=%s", code)

    async def f2f_query(self, code: str) -> F2FResult:
        # 模拟模式下提交即视为已完成，成品为内置占位视频
        if not self._sample_mp4.exists():
            raise AppError(AI_RESULT_MISSING)
        return F2FResult(status=2, message="mock success", result_rel_path=MOCK_RESULT_FILENAME)

    def mock_result_path(self):
        return self._sample_mp4

    async def probe_services(self) -> dict[str, str]:
        return {"tts": "mock", "f2f": "mock", "asr": "unknown"}


def mock_result_artifact(settings):
    """模拟模式成品固定指向内置 sample.mp4。"""
    return settings.mock_assets_dir / "sample.mp4"


def new_mock_code() -> str:
    return str(uuid.uuid4())
