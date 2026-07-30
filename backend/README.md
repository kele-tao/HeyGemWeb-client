# HeyGem Backend

> FastAPI 后端服务,负责业务编排、文件存储与 AI 服务调用

## 快速开始

### 环境要求

- Python 3.8+
- FFmpeg (用于视频缩略图生成)
- 已启动三个 AI 服务 (TTS / Face2Face / ASR)

### 安装

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

### 启动

```bash
python main.py
# 服务监听 http://0.0.0.0:8000
```

### Docker 部署

```bash
cd ../deploy
docker-compose up -d
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/data` | GET | 获取所有持久化数据 |
| `/api/data` | POST | 保存所有数据 |
| `/api/model-training` | POST | 训练声音模型 |
| `/api/upload-avatar` | POST | 上传数字人形象 |
| `/api/audio-synthesis` | POST | 合成音频 |
| `/api/audition-voice` | POST | 试听声音 |
| `/api/video-synthesis` | POST | 合成视频 |
| `/api/batch-progress-check` | POST | 批量检查进度 |

完整文档:访问运行后的 `/docs` (FastAPI 自动生成)

## 配置

### 路径配置

修改 `main.py` 顶部的目录常量:

```python
VOICE_DATA_DIR = "/root/heygem_data/voice/data"
FACE_TEMP_DIR = "/root/heygem_data/face2face/temp"
AVATAR_DIR = "static_avatars"
STATIC_DIR = "static_files"
```

生产环境使用绝对路径,开发环境可使用相对路径。

### 跨域配置

修改 `origins` 列表以允许前端跨域访问:

```python
origins = [
    "http://localhost",
    "http://localhost:80",
    "http://localhost:8080",
    "https://your-domain.com",  # 生产环境
]
```

## 数据存储

后端使用 JSON 文件作为存储 (`huiying_ai_db.json`)。**生产环境强烈建议切换到数据库 (PostgreSQL/MySQL/SQLite)**。

## 文件存储

- `static_avatars/` — 数字人视频与缩略图
- `static_files/` — 合成后的视频、试听缓存

**生产环境建议**:
- 使用对象存储 (S3 / OSS / MinIO)
- 启用 CDN 加速
- 设置合理的缓存策略

## 已知问题

- 路径硬编码 Linux 绝对路径,Windows 部署需修改
- JSON 文件存储无并发锁,生产环境有风险
- 同步 requests 调用 AI 服务阻塞事件循环
- 单线程串行队列处理视频合成,GPU 资源未充分利用

这些已在路线图中,详见 [../CHANGELOG.md](../CHANGELOG.md)。

## 许可

[MIT License](../LICENSE)
