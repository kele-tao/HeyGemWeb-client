"""AI 服务集成边界：协议适配 + 模拟实现（启动期一次性决定，运行期不切换）。"""

from .base import AIProvider, F2FResult, PreprocessResult, build_provider

__all__ = ["AIProvider", "F2FResult", "PreprocessResult", "build_provider"]
