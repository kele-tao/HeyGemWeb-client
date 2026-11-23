"""任务队列实现：原子领取、租约心跳、执行分派、重启恢复。

- SQLite：BEGIN IMMEDIATE 串行化写锁；PostgreSQL：FOR UPDATE SKIP LOCKED。
- 租约只证明"还有人管"，真正终止靠超时；两者缺一不可。
"""

from __future__ import annotations

import asyncio
import json
from datetime import timedelta

from sqlalchemy import select, text, update

from ..config import Settings
from ..db import Database
from ..errors import AppError, JOB_INTERRUPTED, JOB_TIMEOUT, RETRYABLE_CODES
from ..models import Job
from ..utils import logger, utcnow
from ..services import job_service

TERMINAL = ("succeeded", "failed", "canceled")


class JobQueue:
    def __init__(self, db: Database, settings: Settings, worker_id: str) -> None:
        self.db = db
        self.settings = settings
        self.worker_id = worker_id

    # ------------------------------------------------------------ 领取
    async def claim_one(self) -> Job | None:
        if self.db.is_sqlite:
            return await self._claim_sqlite()
        return await self._claim_postgres()

    async def _claim_sqlite(self) -> Job | None:
        now = utcnow()
        async with self.db.begin_immediate() as conn:
            row = (
                await conn.execute(
                    text(
                        "SELECT id FROM jobs WHERE status='queued' AND run_after <= :now "
                        "ORDER BY priority ASC, created_at ASC LIMIT 1"
                    ),
                    {"now": now},
                )
            ).first()
            if row is None:
                return None
            job_id = row[0]
            result = await conn.execute(
                text(
                    "UPDATE jobs SET status='running', lease_owner=:owner, "
                    "lease_expires_at=:lease, started_at=COALESCE(started_at, :now), "
                    "attempt=attempt+1, updated_at=:now "
                    "WHERE id=:id AND status='queued'"
                ),
                {
                    "owner": self.worker_id,
                    "lease": now + timedelta(seconds=self.settings.job_lease_seconds),
                    "now": now,
                    "id": job_id,
                },
            )
            if result.rowcount == 0:
                return None
        async with self.db.session() as session:
            job = await session.get(Job, job_id)
            if job is None:
                return None
            session.expunge(job)
            logger.info(
                "领取任务 job_id=%s kind=%s attempt=%s owner=%s",
                job.id,
                job.kind,
                job.attempt,
                self.worker_id,
            )
            return job

    async def _claim_postgres(self) -> Job | None:
        now = utcnow()
        async with self.db.session() as session:
            job = await session.scalar(
                select(Job)
                .where(Job.status == "queued", Job.run_after <= now)
                .order_by(Job.priority.asc(), Job.created_at.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            if job is None:
                return None
            job.status = "running"
            job.lease_owner = self.worker_id
            job.lease_expires_at = now + timedelta(seconds=self.settings.job_lease_seconds)
            job.started_at = job.started_at or now
            job.attempt += 1
            job.updated_at = now
            session.expunge(job)
            return job

    # ------------------------------------------------------------ 心跳
    async def heartbeat(self, job_id: str, stop: asyncio.Event) -> None:
        interval = max(5, self.settings.job_lease_heartbeat_seconds)
        while not stop.is_set():
            try:
                await asyncio.wait_for(stop.wait(), timeout=interval)
                return
            except asyncio.TimeoutError:
                pass
            async with self.db.session() as session:
                await session.execute(
                    update(Job)
                    .where(Job.id == job_id, Job.status == "running")
                    .values(
                        lease_expires_at=utcnow()
                        + timedelta(seconds=self.settings.job_lease_seconds),
                        updated_at=utcnow(),
                    )
                )

    # ------------------------------------------------------------ 终态写入
    async def finish_success(self, job_id: str) -> None:
        async with self.db.session() as session:
            job = await session.get(Job, job_id)
            if job is None:
                return
            job.status = "succeeded"
            job.progress = 100
            job.lease_owner = None
            job.lease_expires_at = None
            job.finished_at = utcnow()
            job.updated_at = utcnow()
            logger.info("任务完成 job_id=%s", job_id)

    async def finish_error(self, job: Job, exc: BaseException) -> None:
        if isinstance(exc, AppError):
            code = exc.code
            message = exc.message
            retryable = exc.retryable
        elif isinstance(exc, asyncio.TimeoutError):
            code, message, retryable = JOB_TIMEOUT, "任务执行超时", True
        else:
            code = JOB_INTERRUPTED
            message = "任务执行失败，请重试"
            retryable = True
            logger.exception("任务异常 job_id=%s", job.id, exc_info=exc)

        async with self.db.session() as session:
            row = await session.get(Job, job.id)
            if row is None:
                return
            row.error_code = code
            row.error_message = message
            row.lease_owner = None
            row.lease_expires_at = None
            row.updated_at = utcnow()
            if retryable and row.attempt < row.max_attempts:
                row.status = "queued"
                row.run_after = utcnow() + timedelta(
                    seconds=job_service.backoff_seconds(self.settings, row.attempt)
                )
                logger.warning(
                    "任务可重试 job_id=%s code=%s attempt=%s/%s",
                    row.id,
                    code,
                    row.attempt,
                    row.max_attempts,
                )
            else:
                row.status = "failed"
                row.finished_at = utcnow()
                logger.error("任务最终失败 job_id=%s code=%s attempt=%s", row.id, code, row.attempt)

    # ------------------------------------------------------------ 恢复
    async def recover_expired(self) -> int:
        """回收过期租约：未耗尽尝试→回 queued，耗尽→failed。"""
        now = utcnow()
        recovered = 0
        async with self.db.session() as session:
            rows = list(
                (
                    await session.scalars(
                        select(Job).where(
                            Job.status == "running", Job.lease_expires_at < now
                        )
                    )
                ).all()
            )
            for row in rows:
                row.lease_owner = None
                row.lease_expires_at = None
                row.updated_at = now
                if row.attempt < row.max_attempts:
                    row.status = "queued"
                    row.run_after = now
                    if row.video_id:
                        await job_service.mark_video_queued(session, row.video_id)
                else:
                    row.status = "failed"
                    row.error_code = JOB_INTERRUPTED
                    row.error_message = "任务被中断且已达最大重试次数"
                    row.finished_at = now
                recovered += 1
        if recovered:
            logger.warning("回收过期任务 %s 条", recovered)
        return recovered


class JobWorker:
    """执行器：并发=WORKER_CONCURRENCY，异常不退出循环。"""

    def __init__(self, queue: JobQueue, settings: Settings, handlers: dict) -> None:
        self.queue = queue
        self.settings = settings
        self.handlers = handlers
        self.event = asyncio.Event()
        self._stop = asyncio.Event()
        job_service.set_worker_event(self.event)
        self._tasks: list[asyncio.Task] = []

    async def start(self) -> None:
        for idx in range(max(1, self.settings.worker_concurrency)):
            self._tasks.append(asyncio.create_task(self._loop(idx), name=f"heygem-worker-{idx}"))
        logger.info("worker 已启动 concurrency=%s id=%s", len(self._tasks), self.queue.worker_id)

    async def _loop(self, idx: int) -> None:
        while not self._stop.is_set():
            try:
                job = await self.queue.claim_one()
            except Exception:  # pragma: no cover - 数据库异常不应击穿 worker
                logger.exception("领取任务失败，1s 后重试")
                await asyncio.sleep(1)
                continue
            if job is None:
                try:
                    await asyncio.wait_for(self.event.wait(), timeout=1.0)
                except asyncio.TimeoutError:
                    pass
                self.event.clear()
                continue
            await self._run(job)

    async def _run(self, job: Job) -> None:
        handler = self.handlers.get(job.kind)
        timeout = self.settings.job_timeout(job.kind)
        stop = asyncio.Event()
        heartbeat = asyncio.create_task(self.queue.heartbeat(job.id, stop))
        try:
            if handler is None:
                raise AppError(JOB_INTERRUPTED, "未知任务类型")
            await asyncio.wait_for(handler(job), timeout=timeout)
            await self.queue.finish_success(job.id)
        except asyncio.CancelledError:
            raise
        except BaseException as exc:  # noqa: BLE001 - 任务异常必须收敛为状态
            await self.queue.finish_error(job, exc)
        finally:
            stop.set()
            heartbeat.cancel()
            try:
                await heartbeat
            except (asyncio.CancelledError, Exception):
                pass

    async def stop(self) -> None:
        self._stop.set()
        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        self._tasks.clear()
        logger.info("worker 已停止")

    async def handover(self) -> int:
        """优雅停机：running 任务交还队列（未耗尽）或标失败（已耗尽）。"""
        from ..db import Database  # noqa: F401  (类型提示用)

        now = utcnow()
        count = 0
        async with self.queue.db.session() as session:
            rows = list((await session.scalars(select(Job).where(Job.status == "running"))).all())
            for row in rows:
                row.lease_owner = None
                row.lease_expires_at = None
                row.updated_at = now
                if row.attempt < row.max_attempts:
                    row.status = "queued"
                    row.run_after = now
                else:
                    row.status = "failed"
                    row.error_code = JOB_INTERRUPTED
                    row.error_message = "服务停机导致任务中断"
                    row.finished_at = now
                count += 1
        if count:
            logger.warning("优雅停机交还任务 %s 条", count)
        return count


def load_payload(job: Job) -> dict:
    if not job.payload_json:
        return {}
    try:
        return json.loads(job.payload_json)
    except json.JSONDecodeError:
        return {}