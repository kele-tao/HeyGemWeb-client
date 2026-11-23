# 更新日志

HeyGem 的所有重要变更都会记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [3.0.0] - 2026-11-23

> 主题：从「单机演示版」升级为「可运营的商业版」。账号体系、数据私有、任务不丢、视觉重做四件事同时落地。

### ⚠️ 破坏性变更

- **接口全面重排**：旧的整份覆盖保存通道 `GET/POST /api/data` 与 7 个演示接口（`/api/model-training`、`/api/upload-avatar`、`/api/audio-synthesis`、`/api/audition-voice`、`/api/video-synthesis`、`/api/batch-progress-check`）全部移除，改为资源级 REST 接口。
- **静态目录下线**：`/static`、`/avatars` 不再挂载；媒体一律走短时签名 URL `/api/media/{kind}/{id}?exp&sig`。
- **登录成为前置条件**：所有创作页面需登录；未登录访问自动跳转 `/login`。
- **前端数据不再本地兜底**：删除 localStorage 全量回退与本地 mock 账号表，后端不可用时明确报错（不再伪装成"保存成功"）。
- **数据库迁移**：`huiying_ai_db.json` 不再使用（无账号归属，无法自动迁移），改为 Alembic 管理的 SQLite/PostgreSQL。

### ✨ 新增

**账号与安全**

- 邮箱 + 密码注册登录（Argon2id 哈希，8–128 位），注册成功即登录
- JWT 访问令牌（2h）+ HttpOnly 刷新 Cookie（30d），刷新令牌轮换 + 复用检测
- 退出登录 / 修改密码在**服务端**撤销会话（不是仅前端删令牌）
- 登录限流（同邮箱 5 次/5 分钟、同 IP 20 次/5 分钟）
- 统一错误契约 `{code, message, request_id}`，中文文案可直接展示

**多租户隔离**

- 7 张业务表全部带 `user_id` 归属列，查询强制带用户维度
- 跨用户访问统一返回 `404 RESOURCE_NOT_FOUND`（不泄露资源是否存在）
- 媒体签名绑定 `kind|resource_id|user_id|exp`，他人无法复用链接
- 分享链接只映射单个作品，不暴露作者与其他资源

**任务可靠性**

- `jobs` 表即队列（不引入 Redis/Celery），服务重启后任务仍然存在
- 原子领取（SQLite `BEGIN IMMEDIATE` / PostgreSQL `SKIP LOCKED`），同一资源只允许一个活跃任务（部分唯一索引）
- 租约（120s）+ 心跳（30s）+ 单任务硬时限，崩溃后由租约回收兜底
- 失败分类：可重试按 `10/60/300s` 退避，不可重试立即终态；错误码 + 中文原因落库并对外返回
- 优雅停机把 `running` 任务交还队列或明确标失败（不允许留下永远 running 的任务）
- 排队位次 `queue_position` 实时计算；进度按阶段推进（不伪造百分比）

**素材与作品**

- 数字人：上传 → 异步探测/抽帧 → `ready`；支持重命名、删除（被进行中作品引用时 409）
- 声音：上传 → 异步训练 → `complete`；试听缓存按 `(voice_id, 文本哈希)` 唯一（修复"换文案仍返回旧音频"）
- 作品：提交 → 排队 → 处理 → 成功/失败；支持重命名、删除、一键重试、分享/撤销分享、下载
- 批量进度 `GET /api/videos/progress?ids=`（非本人 ID 静默跳过）

**存储与配置**

- 全部路径由 `HEYGEM_DATA_ROOT` 派生，数据库只存 POSIX 相对路径（数据目录整体搬迁后仍可用）
- 原子写入（先 `tmp` 后 `os.replace`），启动清空 `tmp`
- 启动期守卫：目录可写、`ffprobe` 可用、生产禁 mock、mock 占位素材存在——任一不满足即拒绝启动

**AI 集成与演示模式**

- `ai/live_provider.py`（httpx AsyncClient，不阻塞事件循环）与 `ai/mock_provider.py` 双实现
- `HEYGEM_AI_MODE=mock` 可完整演示"上传 → 排队 → 处理 → 播放"，状态流转与真实模式一致
- **live 模式 AI 不可达时任务失败，绝不静默降级为 mock**；生产环境默认禁止 mock

**前端（商业 SaaS 视觉与体验）**

- 视觉体系重做：近黑中性深色 + 暖铜强调色，细边框 / 表面色阶 / 克制阴影分层，移除紫色极光渐变与发光
- 完全离线可用（无外网 CDN / 远程字体），深浅两套主题等价可用
- 登录注册页：两栏影棚构图（纯 CSS/SVG，无外链图），分段切换不换路由，失焦校验与就近错误提示
- 应用外壳：侧栏 248 / 72 / 抽屉三档响应式，顶栏 56px 粘性，账号区与退出登录
- 无障碍：全键盘可达与可见焦点环、弹窗焦点陷阱 + Esc、图标按钮 aria-label、破坏性操作二次确认
- 三档宽度（1440 / 768 / 390）无横向滚动

**工程**

- 后端分层：`api / services / models / schemas / jobs / ai / storage / security / config / errors`，单文件不超过约 600 行
- Alembic 单一迁移链（7 张表 + 复合索引 + CHECK + 部分唯一索引）
- pytest 37 例：鉴权生命周期、双账号越权矩阵、任务状态机、上传校验、mock 生成链路、签名与配置守卫
- 部署：docker compose（backend + nginx + 三 AI 服务）、Dockerfile、nginx 反代（512MB 上传）、k8s 清单

### 🔧 变更

- 媒体处理从 `moviepy` 改为系统 `ffmpeg`/`ffprobe` 子进程（减少一层依赖，与 AI 链路前置条件一致）
- 出站 HTTP 从同步 `requests` 改为 `httpx.AsyncClient`
- 数据持久化从 JSON 文件改为 SQLAlchemy 2 async + Alembic
- 生成任务从进程内 `asyncio.Queue` 改为数据库队列

### 📚 文档

- README / backend/README / deploy/README 全面重写，与实现一致
- `ai-docs/` 增补实施落地记录；已知限制显式列在 README

## [2.0.0] - 2026-07-30

### 🎉 全新重构

整个前端从单文件 HTML 重写为现代化 React + TypeScript + Vite 项目。

### ✨ 新增

- **完整 TypeScript 化** — 严格类型,零 `any`
- **Vite 5 构建** — 主包 gzip 101KB,首屏秒开
- **路由懒加载** — 5 个页面变独立 chunk
- **设计系统重塑** — 极光紫蓝渐变 + 毛玻璃 + 微动效
- **Onboarding 引导** — 4 步动画引导,首次访问自动展示
- **编辑器 Wizard** — 4 步骤进度条(选模特/声音/内容/合成)
- **12 个脚本模板** — 6 大类场景(产品/课程/营销/科普/节日/故事)
- **失败诊断** — 智能识别 5 种错误类型,给出重试建议
- **客户校验** — 视频/音频时长 + 格式 + 尺寸
- **智能轮询** — 指数退避 + 页面隐藏暂停
- **客户端草稿** — 离开保护 + localStorage 恢复
- **浏览器标题栏进度** — 实时显示处理中任务数
- **PWA 支持** — manifest + Service Worker
- **暗色模式** — 跟随系统 + 手动切换 + 完整覆盖
- **键盘快捷键** — `g+h/w/a/v/n` 快速导航

## [1.0.0] - 2026-05-01

### 初始版本

- 单文件 HTML 演示版
- Flask 后端 + JSON 文件存储
- 数字人上传与视频合成基础链路
