# 部署说明（商业版 v3）

## 一、部署形态矩阵

| 场景 | 数据库 | 进程形态 | 说明 |
|------|--------|----------|------|
| 本地开发/演示 | SQLite | `python main.py` 单进程（worker 内嵌） | 零外部依赖；`HEYGEM_AI_MODE=mock` 可完整演示 |
| 单机生产 | SQLite 或 PostgreSQL | 单容器（`WORKER_CONCURRENCY=1`，GPU 串行） | 适合单 GPU 主机 |
| 多实例生产 | PostgreSQL | N 个 API 容器（`WORKER_ENABLED=false`）+ 1 个 worker 进程 | GPU 任务集中在一个 worker，避免抢占 |

## 二、文件清单

| 文件 | 用途 |
|------|------|
| `docker-compose.yaml` | 单机编排：backend + web(nginx) + TTS/F2F/ASR |
| `Dockerfile.backend` | 后端镜像（python:3.12-slim + ffmpeg） |
| `Dockerfile.web` | 前端镜像（node 构建 + nginx 托管） |
| `nginx.conf` | 静态资源 + `/api` 同源反代（`client_max_body_size 512m`） |
| `backend.yaml` / `web.yaml` | Kubernetes Deployment/Service 示例 |

## 三、快速启动

```bash
cd deploy

# 演示模式（不需要 AI 服务，产物为 4 秒占位视频）
HEYGEM_AI_MODE=mock \
HEYGEM_ALLOW_MOCK_IN_PRODUCTION=true \
HEYGEM_JWT_SECRET=$(openssl rand -base64 48) \
docker compose up -d --build

# 生产（需要 AI 服务可用）
export HEYGEM_JWT_SECRET=$(openssl rand -base64 48)
docker compose up -d --build
```

访问 <http://localhost:8080>。

> `HEYGEM_JWT_SECRET` 是必填项（compose 里用 `${VAR:?}` 强制），生产环境不设置会直接启动失败。

## 四、AI 服务与共享目录（硬约束）

TTS 与 Face2Face 的入参是"**服务内部数据目录中的文件名**"，因此后端必须与它们共享目录：

| 服务 | 容器内目录 | 后端写入位置 | compose 挂载 |
|------|-----------|--------------|--------------|
| TTS | `/code/data` | `HEYGEM_TTS_HANDOFF_DIR` | `./volumes/tts:/app/data/handoff/tts` + `./volumes/tts:/code/data` |
| Face2Face | `/code/data` | `HEYGEM_F2F_HANDOFF_DIR` | `./volumes/f2f:/app/data/handoff/f2f` + `./volumes/f2f:/code/data` |

跨主机部署 AI 服务时该协议不成立，需改为对象存储 URL 或由 AI 侧扩展上传接口——**不要在业务层猜路径兼容**。

## 五、数据卷与备份

| 内容 | 位置 |
|------|------|
| 数据库 | `DATA_ROOT/db/app.db`（SQLite）或 PostgreSQL |
| 用户媒体 | `DATA_ROOT/users/{user_id}/...` |
| handoff | `DATA_ROOT/handoff/{tts,f2f}`（传输中转，不是存储） |
| 试听缓存 | `DATA_ROOT/cache/auditions/...` |

- SQLite 备份：`sqlite3 app.db ".backup backup.db"` + 同步 `DATA_ROOT/users`（库与文件必须成套备份）
- PostgreSQL 备份：`pg_dump` + 同步 `DATA_ROOT/users`

## 六、排障

| 现象 | 排查 |
|------|------|
| 容器反复重启 | `docker compose logs heygem-backend`；常见为未设 `HEYGEM_JWT_SECRET` 或生产环境误开 mock |
| 上传 413 | nginx `client_max_body_size`（已设 512m）与后端 `HEYGEM_MAX_AVATAR_BYTES` 任一过小 |
| 任务永远排队 | 检查 worker 是否为 true；查看日志中"领取任务"是否出现 |
| AI 任务失败 `AI_SERVICE_UNAVAILABLE` | AI 服务端口不可达，或 handoff 目录未共享 |
| 刷新页面被登出 | Cookie `Path=/api/auth` 需与反代路径一致；HTTPS 下需 `X-Forwarded-Proto` 正确 |
