"""多租户隔离：双账号 A/B 交叉访问矩阵（REQ-002）。

口径：跨用户访问统一 404 RESOURCE_NOT_FOUND；列表只返回自己的数据。
"""

from __future__ import annotations

import pytest

from .helpers import create_avatar


@pytest.mark.asyncio
async def test_cross_user_access_returns_404(client, user_factory, media_factory):
    alice = await user_factory()
    bob = await user_factory()
    avatar = await create_avatar(client, alice, media_factory("video"), name="A 的数字人")
    avatar_id = avatar["id"]

    assert (await client.get(f"/api/avatars/{avatar_id}", headers=bob["headers"])).status_code == 404

    rename = await client.patch(
        f"/api/avatars/{avatar_id}", headers=bob["headers"], json={"name": "hacked"}
    )
    assert rename.status_code == 404

    delete = await client.delete(f"/api/avatars/{avatar_id}", headers=bob["headers"])
    assert delete.status_code == 404

    # 列表隔离：B 看不到 A 的数字人
    bobs = await client.get("/api/avatars", headers=bob["headers"])
    assert bobs.status_code == 200 and bobs.json() == []

    # A 自己能看到
    alices = await client.get("/api/avatars", headers=alice["headers"])
    assert [a["id"] for a in alices.json()] == [avatar_id]


@pytest.mark.asyncio
async def test_cannot_submit_video_with_others_avatar(client, user_factory, media_factory):
    alice = await user_factory()
    bob = await user_factory()
    avatar = await create_avatar(client, alice, media_factory("video"))
    audio = media_factory("audio")

    with open(audio, "rb") as fh:
        resp = await client.post(
            "/api/videos",
            headers=bob["headers"],
            data={"title": "偷用别人的数字人", "avatar_id": avatar["id"]},
            files={"audio_file": ("audio.wav", fh, "audio/wav")},
        )
    assert resp.status_code == 404
    assert resp.json()["code"] == "RESOURCE_NOT_FOUND"


@pytest.mark.asyncio
async def test_media_signature_is_bound_to_owner(client, user_factory, media_factory):
    alice = await user_factory()
    bob = await user_factory()
    avatar = await create_avatar(client, alice, media_factory("video"))
    video_url = avatar["video_url"]
    assert video_url
    # A 的签名 URL 在未改签名时可下载（签名本身含 A 的 user_id）
    ok = await client.get(video_url)
    assert ok.status_code == 200
    # 篡改签名 → 403
    tampered = video_url.rsplit("sig=", 1)[0] + "sig=deadbeef"
    denied = await client.get(tampered)
    assert denied.status_code == 403
    assert denied.json()["code"] == "MEDIA_SIGNATURE_INVALID"
    # 无签名 → 403
    bare = await client.get(f"/api/media/avatar-video/{avatar['id']}")
    assert bare.status_code == 403


@pytest.mark.asyncio
async def test_progress_endpoint_ignores_foreign_ids(client, user_factory, media_factory):
    alice = await user_factory()
    bob = await user_factory()
    avatar = await create_avatar(client, alice, media_factory("video"))
    audio = media_factory("audio")
    with open(audio, "rb") as fh:
        video = await client.post(
            "/api/videos",
            headers=alice["headers"],
            data={"title": "A 的作品", "avatar_id": avatar["id"]},
            files={"audio_file": ("audio.wav", fh, "audio/wav")},
        )
    video_id = video.json()["id"]
    resp = await client.get(f"/api/videos/progress?ids={video_id}", headers=bob["headers"])
    assert resp.status_code == 200
    assert resp.json() == []
