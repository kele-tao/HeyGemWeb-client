"""任务队列：mock 生成链路、状态机、重试、租约回收、重启恢复。"""

from __future__ import annotations

import pytest
from sqlalchemy import select, update

from .helpers import create_avatar, create_voice, wait_for_status


@pytest.mark.asyncio
async def test_avatar_prepare_reaches_ready(client, user_factory, media_factory):
    user = await user_factory()
    avatar = await create_avatar(client, user, media_factory("video"))
    assert avatar["status"] == "processing"
    assert avatar["video_url"]
    final = await wait_for_status(client, user, "avatars", avatar["id"], ("ready", "failed"))
    assert final["status"] == "ready"
    assert final["thumb_url"]
    assert final["error_code"] is None
    assert final["duration_ms"] > 0


@pytest.mark.asyncio
async def test_voice_training_reaches_complete(client, user_factory, media_factory):
    user = await user_factory()
    voice = await create_voice(client, user, media_factory("audio"))
    assert voice["status"] == "training"
    # 契约要求：参考音频与识别文本不出现在响应中
    assert "asr_rel_path" not in voice and "reference_text" not in voice
    final = await wait_for_status(client, user, "voices", voice["id"], ("complete", "failed"))
    assert final["status"] == "complete"


@pytest.mark.asyncio
async def test_full_video_pipeline_mock(client, user_factory, media_factory):
    user = await user_factory()
    avatar = await create_avatar(client, user, media_factory("video"))
    avatar = await wait_for_status(client, user, "avatars", avatar["id"], ("ready",))
    with open(media_factory("audio"), "rb") as fh:
        resp = await client.post(
            "/api/videos",
            headers=user["headers"],
            data={"title": "新品发布口播", "avatar_id": avatar["id"], "script": "大家好"},
            files={"audio_file": ("audio.wav", fh, "audio/wav")},
        )
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["status"] == "queued"
    assert created["queue_position"] == 1
    assert created["thumb_url"]

    final = await wait_for_status(client, user, "videos", created["id"], ("success", "failed"))
    assert final["status"] == "success", final
    assert final["progress"] == 100
    assert final["stream_url"] and final["download_url"]
    assert final["completed_at"]
    assert final["duration_ms"] and final["duration_ms"] > 0


@pytest.mark.asyncio
async def test_share_link_lifecycle(client, user_factory, media_factory):
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
                data={"title": "可分享作品", "avatar_id": avatar["id"]},
                files={"audio_file": ("audio.wav", fh, "audio/wav")},
            )
        ).json()
    # 未成功不可分享
    early = await client.post(f"/api/videos/{created['id']}/share", headers=user["headers"])
    assert early.status_code == 409
    await wait_for_status(client, user, "videos", created["id"], ("success",))
    share = await client.post(f"/api/videos/{created['id']}/share", headers=user["headers"])
    assert share.status_code == 200
    token = share.json()["share_token"]
    meta = await client.get(f"/api/share/{token}/meta")
    assert meta.status_code == 200 and meta.json()["title"] == "可分享作品"
    stream = await client.get(f"/api/share/{token}")
    assert stream.status_code == 200
    assert stream.headers["content-type"].startswith("video/")

    revoke = await client.delete(f"/api/videos/{created['id']}/share", headers=user["headers"])
    assert revoke.status_code == 204
    assert (await client.get(f"/api/share/{token}/meta")).status_code == 404


@pytest.mark.asyncio
async def test_retry_only_for_failed_video(client, user_factory, media_factory):
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
                data={"title": "重试测试", "avatar_id": avatar["id"]},
                files={"audio_file": ("audio.wav", fh, "audio/wav")},
            )
        ).json()
    resp = await client.post(f"/api/videos/{created['id']}/retry", headers=user["headers"])
    assert resp.status_code == 409
    assert resp.json()["code"] == "RESOURCE_STATE_INVALID"


@pytest.mark.asyncio
async def test_retry_failed_video_requeues(client, user_factory, media_factory, app_instance):
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
                data={"title": "失败作品", "avatar_id": avatar["id"]},
                files={"audio_file": ("audio.wav", fh, "audio/wav")},
            )
        ).json()
    # 等首个任务收敛后再人为置为失败（避免与运行中的任务抢同一资源）
    await wait_for_status(client, user, "videos", created["id"], ("success", "failed"))
    db = app_instance.state.db
    from app.models import Job, Video

    async with db.session() as session:
        await session.execute(
            update(Job).where(Job.video_id == created["id"]).values(status="canceled")
        )
        await session.execute(
            update(Video)
            .where(Video.id == created["id"])
            .values(status="failed", error_code="AI_SERVICE_UNAVAILABLE", error_message="AI 不可达")
        )
    retried = await client.post(f"/api/videos/{created['id']}/retry", headers=user["headers"])
    assert retried.status_code == 202, retried.text
    body = retried.json()
    assert body["status"] == "queued"
    assert body["error_code"] is None
    final = await wait_for_status(client, user, "videos", created["id"], ("success", "failed"))
    assert final["status"] in {"success", "failed"}


@pytest.mark.asyncio
async def test_expired_lease_is_recovered(app_instance):
    from app.jobs.queue import JobQueue
    from app.models import Job
    from app.utils import new_id, utcnow

    settings = app_instance.state.settings
    db = app_instance.state.db
    job_id = new_id()
    # 先建真实的 user/avatar，满足外键约束（租约回收只关心任务行）
    from app.models import Avatar, User
    from app.services import avatar_service

    user_id, avatar_id = new_id(), new_id()
    async with db.session() as session:
        session.add(
            User(
                id=user_id,
                email=f"{user_id[:8]}@example.com",
                password_hash="x",
                status="active",
                created_at=utcnow(),
                updated_at=utcnow(),
                password_changed_at=utcnow(),
            )
        )
        await session.flush()
        session.add(
            Avatar(
                id=avatar_id,
                user_id=user_id,
                name="租约测试",
                status="processing",
                created_at=utcnow(),
                updated_at=utcnow(),
            )
        )
    async with db.session() as session:
        session.add(
            Job(
                id=job_id,
                kind="avatar_prepare",
                user_id=user_id,
                avatar_id=avatar_id,
                status="running",
                attempt=1,
                max_attempts=3,
                run_after=utcnow(),
                lease_owner="dead-worker",
                lease_expires_at=utcnow().replace(year=2020),
                progress=10,
                created_at=utcnow(),
                updated_at=utcnow(),
            )
        )
    queue = JobQueue(db, settings, "recovery")
    recovered = await queue.recover_expired()
    assert recovered >= 1
    async with db.session() as session:
        job = await session.get(Job, job_id)
        assert job is not None
        assert job.status == "queued"
        assert job.lease_owner is None
        # 外键指向不存在的资源，清理以免干扰其他断言
        await session.delete(job)


@pytest.mark.asyncio
async def test_backoff_sequence(settings_fixture=None):
    from app.config import get_settings

    settings = get_settings()
    from app.services.job_service import backoff_seconds

    assert backoff_seconds(settings, 1) == 10
    assert backoff_seconds(settings, 2) == 60
    assert backoff_seconds(settings, 3) == 300
    assert backoff_seconds(settings, 9) == 300