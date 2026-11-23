"""测试辅助：上传数字人/声音并等待异步任务收敛。"""

from __future__ import annotations

import asyncio


async def create_avatar(client, user: dict, video_path, name: str = "测试数字人") -> dict:
    with open(video_path, "rb") as fh:
        resp = await client.post(
            "/api/avatars",
            headers=user["headers"],
            data={"name": name},
            files={"video_file": ("face.mp4", fh, "video/mp4")},
        )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def create_voice(client, user: dict, audio_path, name: str = "测试声音") -> dict:
    with open(audio_path, "rb") as fh:
        resp = await client.post(
            "/api/voices",
            headers=user["headers"],
            data={"name": name},
            files={"audio_file": ("sample.wav", fh, "audio/wav")},
        )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def wait_for_status(
    client, user: dict, kind: str, resource_id: str, targets: tuple[str, ...], timeout: float = 20.0
) -> dict:
    """轮询直到状态收敛（任务由后台 worker 推进）。"""
    loop = asyncio.get_event_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        resp = await client.get(f"/api/{kind}/{resource_id}", headers=user["headers"])
        assert resp.status_code == 200, resp.text
        body = resp.json()
        if body["status"] in targets:
            return body
        await asyncio.sleep(0.2)
    raise AssertionError(f"{kind}/{resource_id} 未在 {timeout}s 内到达 {targets}，当前={body}")
