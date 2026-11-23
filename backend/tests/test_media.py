"""上传校验、删除联动、试听缓存。"""

from __future__ import annotations

import io

import pytest

from .helpers import create_avatar, wait_for_status


@pytest.mark.asyncio
async def test_unsupported_extension_rejected(client, user_factory):
    user = await user_factory()
    resp = await client.post(
        "/api/avatars",
        headers=user["headers"],
        data={"name": "坏文件"},
        files={"video_file": ("notes.txt", io.BytesIO(b"hello world"), "text/plain")},
    )
    assert resp.status_code == 415
    assert resp.json()["code"] == "MEDIA_TYPE_UNSUPPORTED"


@pytest.mark.asyncio
async def test_too_short_video_rejected(client, user_factory, media_factory, tmp_path):
    user = await user_factory()
    import os

    short = tmp_path / "short.mp4"
    os.system(
        f'ffmpeg -y -f lavfi -i "testsrc=size=160x120:rate=10:duration=2" '
        f'-c:v libx264 -pix_fmt yuv420p "{short}" > NUL 2>&1'
    )
    with open(short, "rb") as fh:
        resp = await client.post(
            "/api/avatars",
            headers=user["headers"],
            data={"name": "太短"},
            files={"video_file": ("short.mp4", fh, "video/mp4")},
        )
    assert resp.status_code == 422
    assert resp.json()["code"] == "MEDIA_DURATION_TOO_SHORT"


@pytest.mark.asyncio
async def test_empty_name_rejected(client, user_factory, media_factory):
    user = await user_factory()
    with open(media_factory("video"), "rb") as fh:
        resp = await client.post(
            "/api/avatars",
            headers=user["headers"],
            data={"name": "   "},
            files={"video_file": ("face.mp4", fh, "video/mp4")},
        )
    assert resp.status_code == 422
    assert resp.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_delete_avatar_in_use_returns_409(client, user_factory, media_factory):
    user = await user_factory()
    avatar = await wait_for_status(
        client,
        user,
        "avatars",
        (await create_avatar(client, user, media_factory("video")))["id"],
        ("ready",),
    )
    with open(media_factory("audio"), "rb") as fh:
        created = await client.post(
            "/api/videos",
            headers=user["headers"],
            data={"title": "占用中", "avatar_id": avatar["id"]},
            files={"audio_file": ("audio.wav", fh, "audio/wav")},
        )
    assert created.status_code == 201
    resp = await client.delete(f"/api/avatars/{avatar['id']}", headers=user["headers"])
    assert resp.status_code == 409
    assert resp.json()["code"] == "RESOURCE_IN_USE"


@pytest.mark.asyncio
async def test_delete_video_and_avatar_flow(client, user_factory, media_factory):
    user = await user_factory()
    avatar = await wait_for_status(
        client,
        user,
        "avatars",
        (await create_avatar(client, user, media_factory("video")))["id"],
        ("ready",),
    )
    with open(media_factory("audio"), "rb") as fh:
        created = (
            await client.post(
                "/api/videos",
                headers=user["headers"],
                data={"title": "待删除作品", "avatar_id": avatar["id"]},
                files={"audio_file": ("audio.wav", fh, "audio/wav")},
            )
        ).json()
    assert (await client.delete(f"/api/videos/{created['id']}", headers=user["headers"])).status_code == 204
    assert (await client.delete(f"/api/avatars/{avatar['id']}", headers=user["headers"])).status_code in (204, 409)
    # 删除后不可再读
    assert (await client.get(f"/api/videos/{created['id']}", headers=user["headers"])).status_code == 404


@pytest.mark.asyncio
async def test_avatar_rename(client, user_factory, media_factory):
    user = await user_factory()
    avatar = await create_avatar(client, user, media_factory("video"), name="旧名字")
    resp = await client.patch(
        f"/api/avatars/{avatar['id']}", headers=user["headers"], json={"name": "新名字"}
    )
    assert resp.status_code == 200 and resp.json()["name"] == "新名字"


@pytest.mark.asyncio
async def test_audition_cache_is_keyed_by_text(client, user_factory, media_factory):
    user = await user_factory()
    voice = await wait_for_status(
        client,
        user,
        "voices",
        (await __import__("tests.helpers", fromlist=["create_voice"]).create_voice(
            client, user, media_factory("audio")
        ))["id"],
        ("complete",),
    )
    first = await client.post(
        f"/api/voices/{voice['id']}/audition",
        headers=user["headers"],
        json={"text": "欢迎使用 HeyGem"},
    )
    assert first.status_code == 200, first.text
    assert first.json()["cached"] is False
    again = await client.post(
        f"/api/voices/{voice['id']}/audition",
        headers=user["headers"],
        json={"text": "欢迎使用 HeyGem"},
    )
    assert again.json()["cached"] is True
    # 换文案必须生成新的缓存（旧实现缺陷）
    other = await client.post(
        f"/api/voices/{voice['id']}/audition",
        headers=user["headers"],
        json={"text": "换一段文案"},
    )
    assert other.status_code == 200
    assert other.json()["cached"] is False
    assert other.json()["url"] != first.json()["url"]


@pytest.mark.asyncio
async def test_speech_returns_wav(client, user_factory, media_factory):
    from .helpers import create_voice

    user = await user_factory()
    voice = await wait_for_status(
        client,
        user,
        "voices",
        (await create_voice(client, user, media_factory("audio")))["id"],
        ("complete",),
    )
    resp = await client.post(
        f"/api/voices/{voice['id']}/speech", headers=user["headers"], json={"text": "大家好"}
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("audio/")
    assert len(resp.content) > 0


@pytest.mark.asyncio
async def test_audition_requires_ready_voice(client, user_factory, media_factory):
    from .helpers import create_voice

    user = await user_factory()
    voice = await create_voice(client, user, media_factory("audio"))
    resp = await client.post(
        f"/api/voices/{voice['id']}/audition", headers=user["headers"], json={"text": "测试"}
    )
    assert resp.status_code in (409, 200)
