"""AI provider 抽象与工厂。

铁律：live 模式下 AI 不可达 → 任务失败（绝不回落 mock）；
mock 模式只由 HEYGEM_AI_MODE 决定，不由运行期错误触发。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True)
class PreprocessResult:
    """TTS 预处理结果：参考音频（handoff 内文件名）+ 识别文本。"""

    reference_filename: str
    reference_text: str


@dataclass(slots=True)
class F2FResult:
    """Face2Face 查询结果：status 2=成功 / 1=处理中 / 其它=失败。"""

    status: int
    message: str = ""
    result_rel_path: str | None = None


class AIProvider(Protocol):
    name: str
    mode: str

    async def preprocess_voice(self, handoff_filename: str) -> PreprocessResult: ...

    async def synthesize_speech(
        self, text: str, reference_filename: str, reference_text: str
    ) -> bytes: ...

    async def f2f_submit(self, audio_filename: str, video_filename: str, code: str) -> None: ...

    async def f2f_query(self, code: str) -> F2FResult: ...

    async def probe_services(self) -> dict[str, str]: ...


def build_provider(settings) -> AIProvider:
    if settings.ai_mode == "mock":
        from .mock_provider import MockProvider

        return MockProvider(settings)
    from .live_provider import LiveProvider

    return LiveProvider(settings)
