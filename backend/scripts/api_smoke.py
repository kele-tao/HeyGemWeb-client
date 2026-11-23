"""后端全链路冒烟：注册 → 上传素材 → 生成 → 轮询 → 分享 → 删改 → 越权校验。

用法（后端需已启动）：
  python scripts/api_smoke.py [--base http://127.0.0.1:8000]
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

FAILED: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(("PASS " if ok else "FAIL ") + name + (f"  <- {detail}" if detail and not ok else ""))
    if not ok:
        FAILED.append(name)


class Api:
    def __init__(self, base: str) -> None:
        self.base = base.rstrip("/")
        self.token: str | None = None

    def request(self, method: str, path: str, *, json_body=None, files=None, data=None, raw=False):
        url = f"{self.base}{path}"
        headers: dict[str, str] = {}
        body: bytes | None = None
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if files:
            boundary = f"----heygem{uuid.uuid4().hex}"
            parts: list[bytes] = []
            for key, value in (data or {}).items():
                parts.append(
                    f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{value}\r\n".encode()
                )
            for key, file_path in files.items():
                filename = os.path.basename(file_path)
                ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
                with open(file_path, "rb") as fh:
                    content = fh.read()
                parts.append(
                    (
                        f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"; "
                        f"filename=\"{filename}\"\r\nContent-Type: {ctype}\r\n\r\n"
                    ).encode()
                    + content
                    + b"\r\n"
                )
            parts.append(f"--{boundary}--\r\n".encode())
            body = b"".join(parts)
            headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        elif json_body is not None:
            body = json.dumps(json_body).encode()
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                payload = resp.read()
                if raw:
                    return resp.status, payload
                return resp.status, json.loads(payload) if payload else None
        except urllib.error.HTTPError as exc:
            payload = exc.read()
            try:
                parsed = json.loads(payload)
            except Exception:
                parsed = payload.decode(errors="replace")
            return exc.code, parsed

    def get(self, path, **kw):
        return self.request("GET", path, **kw)

    def post(self, path, **kw):
        return self.request("POST", path, **kw)

    def patch(self, path, **kw):
        return self.request("PATCH", path, **kw)

    def delete(self, path, **kw):
        return self.request("DELETE", path, **kw)


def make_media() -> dict[str, str]:
    tmp = tempfile.mkdtemp(prefix="heygem-smoke-")
    video = os.path.join(tmp, "face.mp4")
    audio = os.path.join(tmp, "sample.wav")
    subprocess.run(
        f'ffmpeg -y -f lavfi -i "testsrc=size=320x240:rate=15:duration=31" -c:v libx264 -pix_fmt yuv420p "{video}"',
        shell=True, capture_output=True,
    )
    subprocess.run(
        f'ffmpeg -y -f lavfi -i "sine=frequency=440:duration=31" -c:a pcm_s16le "{audio}"',
        shell=True, capture_output=True,
    )
    assert os.path.exists(video) and os.path.exists(audio), "测试媒体生成失败"
    return {"video": video, "audio": audio}


def wait_status(api: Api, kind: str, rid: str, targets: set[str], timeout: float = 120.0) -> dict:
    deadline = time.time() + timeout
    body: dict = {}
    while time.time() < deadline:
        status, body = api.get(f"/api/{kind}/{rid}")
        if status == 200 and body.get("status") in targets:
            return body
        time.sleep(1.0)
    raise AssertionError(f"{kind}/{rid} 未在 {timeout}s 内达到 {targets}，最后状态={body}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    args = parser.parse_args()

    api = Api(args.base)
    status, body = api.get("/api/system/status")
    check("system-status", status == 200 and "ai_mode" in body, str(body))
    ai_mode = body.get("ai_mode") if isinstance(body, dict) else None

    email = f"smoke-{uuid.uuid4().hex[:8]}@example.com"
    status, body = api.post("/api/auth/register", json_body={"email": email, "password": "strong-pass-2026"})
    check("register", status == 201 and body.get("access_token"), str(body))
    api.token = body["access_token"]
    user_id = body["user"]["id"]

    status, body = api.get("/api/auth/me")
    check("me", status == 200 and body.get("email") == email, str(body))

    status, body = api.get("/api/bootstrap")
    check("bootstrap-empty", status == 200 and body["avatars"] == [] and body["videos"] == [], str(body)[:200])

    media = make_media()
    status, avatar = api.post(
        "/api/avatars", files={"video_file": media["video"]}, data={"name": "冒烟数字人"}
    )
    check("avatar-create", status == 201 and avatar.get("status") == "processing", str(avatar)[:200])
    avatar = wait_status(api, "avatars", avatar["id"], {"ready", "failed"})
    check("avatar-ready", avatar["status"] == "ready", str(avatar)[:200])
    check("avatar-thumb", bool(avatar.get("thumb_url")), str(avatar)[:200])

    status, voice = api.post(
        "/api/voices", files={"audio_file": media["audio"]}, data={"name": "冒烟声音"}
    )
    check("voice-create", status == 201 and voice.get("status") == "training", str(voice)[:200])
    voice = wait_status(api, "voices", voice["id"], {"complete", "failed"})
    check("voice-complete", voice["status"] == "complete", str(voice)[:200])
    check("voice-hides-internals", "asr_rel_path" not in voice and "reference_text" not in voice, str(voice)[:200])

    status, audition = api.post(f"/api/voices/{voice['id']}/audition", json_body={"text": "欢迎使用 HeyGem"})
    check("audition", status == 200 and audition.get("url"), str(audition)[:200])
    status, audition2 = api.post(f"/api/voices/{voice['id']}/audition", json_body={"text": "欢迎使用 HeyGem"})
    check("audition-cached", status == 200 and audition2.get("cached") is True, str(audition2)[:200])

    status, audio_bytes = api.post(f"/api/voices/{voice['id']}/speech", json_body={"text": "大家好"}, raw=True)
    check("speech-wav", status == 200 and len(audio_bytes) > 0, str(status))

    audio_for_video = os.path.join(tempfile.mkdtemp(prefix="heygem-smoke-audio-"), "voice.wav")
    with open(audio_for_video, "wb") as fh:
        fh.write(audio_bytes)

    status, video = api.post(
        "/api/videos",
        files={"audio_file": audio_for_video},
        data={
            "title": "冒烟作品",
            "avatar_id": avatar["id"],
            "voice_id": voice["id"],
            "script": "大家好，这是冒烟脚本。",
            "category": "product",
        },
    )
    check("video-create", status == 201 and video.get("status") == "queued", str(video)[:250])
    check("video-queue-position", video.get("queue_position") == 1, str(video.get("queue_position")))

    status, progress = api.get(f"/api/videos/progress?ids={video['id']}")
    check("video-progress", status == 200 and len(progress) == 1, str(progress)[:200])

    video = wait_status(api, "videos", video["id"], {"success", "failed"})
    check("video-success", video["status"] == "success", str(video)[:300])
    check("video-urls", bool(video.get("stream_url")) and bool(video.get("download_url")), str(video)[:300])

    status, stream = api.get(video["stream_url"], raw=True)
    check("video-stream", status == 200 and len(stream) > 0, str(status))
    status, downloaded = api.get(video["download_url"], raw=True)
    check("video-download", status == 200 and len(downloaded) > 0, str(status))

    status, renamed = api.patch(f"/api/videos/{video['id']}", json_body={"title": "改名后的作品"})
    check("video-rename", status == 200 and renamed.get("title") == "改名后的作品", str(renamed)[:200])

    status, share = api.post(f"/api/videos/{video['id']}/share")
    check("share-create", status == 200 and share.get("share_token"), str(share)[:200])
    token = share["share_token"]
    anon = Api(args.base)
    status, meta = anon.get(f"/api/share/{token}/meta")
    check("share-meta-anon", status == 200 and meta.get("title") == "改名后的作品", str(meta)[:200])
    status, shared_stream = anon.get(f"/api/share/{token}", raw=True)
    check("share-stream-anon", status == 200, str(status))
    status, _ = anon.get("/api/videos")
    check("share-anon-cannot-list", status == 401, str(status))
    status, _ = api.delete(f"/api/videos/{video['id']}/share")
    check("share-revoke", status == 204, str(status))
    status, meta = anon.get(f"/api/share/{token}/meta")
    check("share-revoked-404", status == 404, str(status))

    # 越权：另一个账号
    other = Api(args.base)
    status, body = other.post("/api/auth/register", json_body={"email": f"other-{uuid.uuid4().hex[:8]}@example.com", "password": "strong-pass-2026"})
    other.token = body["access_token"]
    check("cross-user-avatar-404", other.get(f"/api/avatars/{avatar['id']}")[0] == 404)
    check("cross-user-video-404", other.get(f"/api/videos/{video['id']}")[0] == 404)
    check("cross-user-list-empty", other.get("/api/avatars")[1] == [])
    tampered = video["stream_url"].split("sig=")[0] + "sig=bogus"
    check("media-tamper-403", api.get(tampered)[0] == 403)

    status, _ = api.delete(f"/api/videos/{video['id']}")
    check("video-delete", status == 204, str(status))
    status, _ = api.delete(f"/api/avatars/{avatar['id']}")
    check("avatar-delete", status == 204, str(status))
    status, _ = api.delete(f"/api/voices/{voice['id']}")
    check("voice-delete", status == 204, str(status))

    status, body = api.get("/api/bootstrap")
    check(
        "bootstrap-after-delete",
        status == 200 and body["avatars"] == [] and body["voices"] == [] and body["videos"] == [],
        str(body)[:200],
    )

    status, me_before = api.get("/api/auth/me")
    status, logout_body = api.post("/api/auth/logout")
    check("logout", status == 204, f"{status} {logout_body}")
    status, me_after = api.get("/api/auth/me")
    check("logout-invalidates", status == 401, f"{status} {str(me_after)[:160]}")

    print(f"\nai_mode={ai_mode}; failed={len(FAILED)}")
    if FAILED:
        print("FAILED:", ", ".join(FAILED))
        return 1
    print("ALL BACKEND SMOKE CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())