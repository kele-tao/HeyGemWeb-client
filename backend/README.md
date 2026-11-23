# 后端运行说明（商业版 v3）

> FastAPI 应用：账号与多租户、素材/作品持久化、生成任务队列、AI 服务编排、媒体签名访问。
> 设计依据：`ai-docs/后端设计/`（架构总纲 + 模块设计 + API 契约）。本文件是**落地后的实现说明**，与设计文档保持一致。

## 一、环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Python | 3.11+ | 已用 3.12 验证 |
| ffmpeg / ffprobe | 任意较新版本 | 时长探测与封面抽帧；缺失时**启动即失败**（不允许跳过校验） |
| 数据库 | 无（默认 SQLite） | 生产可切 PostgreSQL（`HEYGEM_DATABASE_URL`） |

## 二、启动

```powershell
cd backend
python -m pip install -r requirements.txt

# 演示模式（无 AI 服务）
$env:HEYGEM_AI_MODE = "mock"
python main.py                 # http://127.0.0.1:8000  接口文档 /docs
```

```bash
# macOS / Linux
HEYGEM_AI_MODE=mock python main.py
```

首次启动会自动：装载配置 → 启动期守卫 → 建 `DATA_ROOT` 目录 → `alembic upgrade head` → 清理 `tmp` → 回收过期任务 → 启动 worker。

## 三、目录结构

```text
backend/
├── main.py                 # 入口（python main.py），实际装配在 app/main.py
├── alembic.ini             # Alembic 配置（保持 ASCII：中文 Windows 下按 GBK 读取）
├── migrations/             # 单一迁移链（0001_initial = 7 张表 + 索引 + CHECK + 部分唯一索引）
├── assets/mock/            # 模拟模式占位素材（sample.wav / sample.mp4 / thumb.jpg）
├── app/
│   ├── main.py             # create_app() + lifespan + 统一异常处理 + request_id 中间件
│   ├── config.py           # pydantic-settings 装载 + 启动期守卫（目录可写/ffprobe/生产禁 mock）
│   ├── db.py               # 引擎、会话工厂、事务辅助（SQLite WAL + busy_timeout + BEGIN IMMEDIATE）
│   ├── security.py         # Argon2id、JWT、刷新令牌摘要、current_user 依赖
│   ├── storage.py          # 路径解析（防穿越）、原子写、ffprobe/ffmpeg、媒体签名 URL
│   ├── errors.py           # AppError + 错误码表 + 中文文案 + 可重试集合
│   ├── ratelimit.py        # 进程内滑动窗口限流
│   ├── models/             # user / auth_session / avatar / voice / audition_cache / video / job
│   ├── schemas/            # 对外 JSON 结构（snake_case）
│   ├── api/                # auth / bootstrap / avatars / voices / videos / media / share / system
│   ├── services/           # auth / avatar / voice / audition / video / job + serializers
│   ├── jobs/               # queue.py（领取/租约/恢复）+ handlers.py（三类任务）
│   └── ai/                 # base（抽象）/ live_provider / mock_provider
├── tests/                  # pytest：鉴权、越权矩阵、任务状态机、上传校验、mock 链路、存储与配置
└── data/                   # 运行时 DATA_ROOT（gitignored）
```

## 四、核心机制速查

| 机制 | 实现 | 代码位置 |
|------|------|----------|
| 认证 | `Authorization: Bearer <JWT>`；刷新令牌走 HttpOnly Cookie `hg_refresh`（`Path=/api/auth`） | `security.py` / `api/auth.py` |
| 会话撤销 | 退出→当前会话；改密→其他会话全部；刷新轮换 | `services/auth_service.py` |
| 多租户 | 所有查询带 `user_id`；跨用户统一 `404 RESOURCE_NOT_FOUND` | `services/*_service.py` |
| 任务队列 | `jobs` 表即队列；`BEGIN IMMEDIATE`（SQLite）/ `SKIP LOCKED`（PG）原子领取 | `jobs/queue.py` |
| 租约 | 领取写 `lease_expires_at`（120s），执行期每 30s 续租，过期回收 | `jobs/queue.py` |
| 重试 | 可重试码退避 `10/60/300s`，耗尽→`failed`；不可重试立即失败 | `errors.RETRYABLE_CODES` |
| 停机 | 停 worker → running 任务回 `queued`（未耗尽）或 `failed`（已耗尽） | `jobs/queue.py: handover` |
| 媒体 | `/api/media/{kind}/{id}?exp&sig`，HMAC 绑定 `kind|id|user_id|exp`，支持 Range | `storage.py` / `api/media.py` |
| 模拟模式 | `HEYGEM_AI_MODE=mock` 启动期决定 provider；live 不可达→任务失败，绝不回落 | `ai/` |

## 五、测试

```bash
cd backend
python -m pytest -q          # 37 passed
```

覆盖点：
- `test_auth.py` — 注册/登录/重复邮箱/弱密码/统一 401 文案/刷新轮换/退出撤销/改密撤销其他会话
- `test_isolation.py` — 双账号交叉访问矩阵（详情/改名/删除/提交作品/进度查询/媒体签名）
- `test_jobs.py` — 数字人建档、声音训练、视频合成全链路、分享生命周期、重试规则、租约回收、退避序列
- `test_media.py` — 格式/时长/空名校验、删除联动 409、试听按文本哈希缓存、speech 返回 wav
- `test_storage_config.py` — 路径穿越拦截、签名过期/跨用户、生产禁 mock 守卫、配置解析

## 六、常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| 启动报 `ffprobe not found` | 未安装 ffmpeg 或不在 PATH | 安装 ffmpeg 并重开终端 |
| 启动报"生产环境禁止 mock" | `APP_ENV=production` 且 `AI_MODE=mock` | 改 `AI_MODE=live`，或显式 `ALLOW_MOCK_IN_PRODUCTION=true`（仅演示） |
| 启动报"缺少占位素材" | `assets/mock/` 文件缺失 | 重新生成或从仓库恢复 |
| live 模式任务全部失败 `AI_SERVICE_UNAVAILABLE` | AI 服务未启动或 handoff 目录不共享 | 检查服务端口与 `TTS_HANDOFF_DIR`/`F2F_HANDOFF_DIR` 挂载 |
| 任务一直 `queued` | `WORKER_ENABLED=false` | 至少一个实例开启 worker |

## 七、不再提供的旧接口

旧演示接口 `GET/POST /api/data`、`/api/model-training`、`/api/upload-avatar`、`/api/audio-synthesis`、`/api/audition-voice`、`/api/video-synthesis`、`/api/batch-progress-check` 以及 `/static`、`/avatars` 静态挂载已全部移除（整份覆盖保存与无鉴权静态目录是 REQ-002/003 不满足的根因）。迁移映射见 `ai-docs/后端设计/API_Contract/契约_前端迁移映射.md`。
