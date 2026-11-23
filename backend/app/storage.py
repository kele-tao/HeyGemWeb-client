"""路径解析、原子写、媒体探测与签名 URL。

铁律：数据库只存 POSIX 风格相对路径；绝对路径由 resolve() 由 DATA_ROOT 派生，
并断言结果仍在 DATA_ROOT 内（越界抛 500 STORAGE_PATH_INVALID）。
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import mimetypes
import os
import shutil
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .config import Settings
from .errors import (
    AppError,
    MEDIA_DURATION_TOO_LONG,
    MEDIA_DURATION_TOO_SHORT,
    MEDIA_PROBE_FAILED,
    MEDIA_TOO_LARGE,
    MEDIA_TYPE_UNSUPPORTED,
    STORAGE_PATH_INVALID,
)

# ------------------------------------------------------------------ 类型白名单
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm"}
AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac"}

_VIDEO_MAGIC = (
    b"\x00\x00\x00\x18ftyp", b"\x00\x00\x00\x20ftyp", b"ftyp",
    b"\x1aE\xdf\xa3",
)
_AUDIO_MAGIC = (b"RIFF", b"ID3", b"fLaC", b"\xff\xf3", b"\xff\xf2", b"OggS", b"\x00\x00\x00")


@dataclass(slots=True)
class MediaInfo:
    duration_ms: int
    width: int | None
    height: int | None
    codec_type: str


def human_bytes(size: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            return f"{size:.0f}{unit}" if unit == "B" else f"{size:.1f}{unit}"
        size /= 1024
    return f"{size}B"


class Storage:
    """DATA_ROOT 之下的全部文件操作入口。"""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.root = settings.data_root_path
        self.tmp = self.root / "tmp"

    # -------------------------------------------------------- 路径解析
    def resolve(self, rel_path: str | None) -> Path:
        if not rel_path:
            raise AppError(STORAGE_PATH_INVALID)
        raw = str(rel_path).replace("\\", "/")
        # 绝对路径（POSIX 或盘符）一律视为非法：库中只允许存相对路径
        if raw.startswith("/") or (len(raw) > 1 and raw[1] == ":"):
            raise AppError(STORAGE_PATH_INVALID)
        rel = raw
        if not rel or rel.startswith("..") or ".." in Path(rel).parts or Path(rel).is_absolute():
            raise AppError(STORAGE_PATH_INVALID)
        candidate = (self.root / rel).resolve()
        try:
            candidate.relative_to(self.root.resolve())
        except ValueError as exc:
            raise AppError(STORAGE_PATH_INVALID) from exc
        return candidate

    def rel(self, path: Path) -> str:
        return path.resolve().relative_to(self.root.resolve()).as_posix()

    # -------------------------------------------------------- 目录规划
    @staticmethod
    def avatar_dir(user_id: str, avatar_id: str) -> str:
        return f"users/{user_id}/avatars/{avatar_id}"

    @staticmethod
    def voice_dir(user_id: str, voice_id: str) -> str:
        return f"users/{user_id}/voices/{voice_id}"

    @staticmethod
    def video_dir(user_id: str, video_id: str) -> str:
        return f"users/{user_id}/videos/{video_id}"

    @staticmethod
    def audition_dir(user_id: str, voice_id: str) -> str:
        return f"cache/auditions/{user_id}/{voice_id}"

    def ensure_dir(self, rel_dir: str) -> Path:
        path = self.resolve(rel_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    # -------------------------------------------------------- 原子写
    def tmp_path(self, suffix: str = "") -> Path:
        self.tmp.mkdir(parents=True, exist_ok=True)
        return self.tmp / (f"{os.urandom(8).hex()}{suffix}")

    def atomic_write_bytes(self, rel_path: str, data: bytes) -> Path:
        target = self.resolve(rel_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(target.suffix + ".part")
        tmp.write_bytes(data)
        os.replace(tmp, target)
        return target

    def atomic_write_stream(self, rel_path: str, file_obj) -> int:
        target = self.resolve(rel_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(target.suffix + ".part")
        size = 0
        with open(tmp, "wb") as out:
            while True:
                chunk = file_obj.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                out.write(chunk)
        os.replace(tmp, target)
        return size

    def atomic_copy(self, src: Path, rel_path: str) -> Path:
        target = self.resolve(rel_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(target.suffix + ".part")
        shutil.copyfile(src, tmp)
        os.replace(tmp, target)
        return target

    def delete_tree(self, rel_path: str) -> None:
        """删除目录树；失败只记日志（先删库后删文件，孤儿文件不影响语义）。"""
        import logging

        try:
            path = self.resolve(rel_path)
        except AppError:
            return
        try:
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
            elif path.exists():
                path.unlink()
        except OSError as exc:  # pragma: no cover - 平台相关
            logging.getLogger("heygem.storage").warning("删除文件失败 %s: %s", path, exc)

    def clear_tmp(self) -> None:
        if self.tmp.exists():
            for child in self.tmp.iterdir():
                try:
                    if child.is_dir():
                        shutil.rmtree(child, ignore_errors=True)
                    else:
                        child.unlink()
                except OSError:  # pragma: no cover
                    pass
        self.tmp.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------- 校验
    def sniff_extension(self, filename: str, head: bytes) -> str:
        ext = Path(filename or "").suffix.lower()
        if ext in VIDEO_EXTENSIONS or ext in AUDIO_EXTENSIONS:
            return ext
        # 扩展名不合法时按魔数推断
        if head.startswith(_VIDEO_MAGIC) or head[4:8] == b"ftyp":
            return ".mp4"
        if head.startswith((b"RIFF", b"ID3", b"fLaC", b"OggS")):
            return ".wav"
        raise AppError(MEDIA_TYPE_UNSUPPORTED)

    def probe(self, path: Path) -> MediaInfo:
        """ffprobe 读取时长/宽高；失败统一 MEDIA_PROBE_FAILED。"""
        cmd = [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(path),
        ]
        try:
            completed = subprocess.run(cmd, capture_output=True, timeout=60, check=False)
        except (OSError, subprocess.SubprocessError) as exc:
            raise AppError(MEDIA_PROBE_FAILED) from exc
        if completed.returncode != 0:
            raise AppError(MEDIA_PROBE_FAILED)
        try:
            payload = json.loads(completed.stdout or b"{}")
        except json.JSONDecodeError as exc:
            raise AppError(MEDIA_PROBE_FAILED) from exc
        streams = payload.get("streams") or []
        duration = 0.0
        try:
            duration = float((payload.get("format") or {}).get("duration") or 0)
        except (TypeError, ValueError):
            duration = 0.0
        video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
        if duration <= 0:
            for s in streams:
                try:
                    duration = max(duration, float(s.get("duration") or 0))
                except (TypeError, ValueError):
                    continue
        if duration <= 0:
            raise AppError(MEDIA_PROBE_FAILED)
        codec_type = "video" if video_stream else ("audio" if audio_stream else "unknown")
        return MediaInfo(
            duration_ms=int(round(duration * 1000)),
            width=int(video_stream["width"]) if video_stream and video_stream.get("width") else None,
            height=int(video_stream["height"]) if video_stream and video_stream.get("height") else None,
            codec_type=codec_type,
        )

    def validate_media(
        self,
        path: Path,
        *,
        allowed_ext: Iterable[str],
        max_bytes: int,
        min_duration_ms: int,
        max_duration_ms: int,
        require_video: bool = False,
    ) -> MediaInfo:
        allowed = set(allowed_ext)
        if path.suffix.lower() not in allowed:
            raise AppError(MEDIA_TYPE_UNSUPPORTED)
        size = path.stat().st_size
        if size <= 0:
            raise AppError(MEDIA_PROBE_FAILED)
        if size > max_bytes:
            raise AppError(MEDIA_TOO_LARGE, f"文件超过体积上限（{human_bytes(max_bytes)}）")
        info = self.probe(path)
        if require_video and info.codec_type != "video":
            raise AppError(MEDIA_TYPE_UNSUPPORTED)
        if info.duration_ms < min_duration_ms:
            raise AppError(
                MEDIA_DURATION_TOO_SHORT,
                f"时长不足，最短需要 {min_duration_ms // 1000} 秒",
            )
        if info.duration_ms > max_duration_ms:
            raise AppError(
                MEDIA_DURATION_TOO_LONG,
                f"时长超限，最长 {max_duration_ms // 1000} 秒",
            )
        return info

    def extract_thumbnail(self, video_path: Path, out_path: Path) -> bool:
        """ffmpeg 抽首帧；失败返回 False（由调用方决定是否视为失败）。"""
        out_path.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            "0.5",
            "-i",
            str(video_path),
            "-frames:v",
            "1",
            "-q:v",
            "3",
            str(out_path),
        ]
        try:
            completed = subprocess.run(cmd, capture_output=True, timeout=120, check=False)
        except (OSError, subprocess.SubprocessError):
            return False
        if completed.returncode != 0 or not out_path.exists() or out_path.stat().st_size == 0:
            # 回退到 0 秒前抽帧（部分短视频 0.5s 处无帧）
            cmd[cmd.index("0.5")] = "0"
            try:
                completed = subprocess.run(cmd, capture_output=True, timeout=120, check=False)
            except (OSError, subprocess.SubprocessError):
                return False
        return out_path.exists() and out_path.stat().st_size > 0

    # -------------------------------------------------------- 签名 URL
    def sign(self, kind: str, resource_id: str, user_id: str | None, ttl: int | None = None) -> str:
        exp = int(time.time()) + (ttl or self.settings.media_url_ttl_seconds)
        payload = f"{kind}|{resource_id}|{user_id or ''}|{exp}"
        secret = self.settings.load_secret().encode("utf-8")
        sig = hmac.new(secret, payload.encode("utf-8"), hashlib.sha256).digest()
        sig_b64 = base64.urlsafe_b64encode(sig).decode("ascii").rstrip("=")
        return f"/api/media/{kind}/{resource_id}?exp={exp}&sig={sig_b64}"

    def verify_signature(self, kind: str, resource_id: str, user_id: str | None, exp: str | None, sig: str | None) -> None:
        if not exp or not sig:
            raise AppError("MEDIA_SIGNATURE_INVALID")
        try:
            exp_int = int(exp)
        except (TypeError, ValueError) as exc:
            raise AppError("MEDIA_SIGNATURE_INVALID") from exc
        if exp_int < int(time.time()):
            raise AppError("MEDIA_SIGNATURE_INVALID")
        payload = f"{kind}|{resource_id}|{user_id or ''}|{exp_int}"
        secret = self.settings.load_secret().encode("utf-8")
        expected = base64.urlsafe_b64encode(
            hmac.new(secret, payload.encode("utf-8"), hashlib.sha256).digest()
        ).decode("ascii").rstrip("=")
        if not hmac.compare_digest(expected, sig):
            raise AppError("MEDIA_SIGNATURE_INVALID")


def content_type_for(path: Path) -> str:
    guessed, _ = mimetypes.guess_type(path.name)
    return guessed or "application/octet-stream"