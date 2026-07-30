# HeyGem 部署配置

> Docker / Docker Compose 部署相关配置

## 快速部署

### 完整部署(所有服务)

```bash
# 1. 启动 AI 服务
docker-compose up -d heygem-tts heygem-f2f heygem-asr

# 2. 启动后端
docker-compose up -d backend

# 3. 构建并启动前端
cd ../web
npm install
npm run build
cd ../deploy
# 用 web.yaml 中的 nginx 服务
docker-compose up -d web
```

### 访问

- 前端:http://localhost:8080
- 后端 API:http://localhost:8000
- API 文档:http://localhost:8000/docs

## 服务说明

| 服务 | 端口 | 镜像 | 说明 |
|------|------|------|------|
| heygem-tts | 18180 | fish-speech-ziming | 语音合成 / 声音克隆 |
| heygem-f2f | 8383 | heygem.ai | 视频合成 / 口型同步 |
| heygem-asr | 10095 | fun-asr | 语音识别 |
| backend | 8000 | heygembackend | FastAPI 后端 |
| web | 80 | heygemweb | 前端 nginx |

## 硬件要求

### 最低配置

- CPU: 4 核
- 内存: 16 GB
- GPU: NVIDIA 8GB+ (RTX 3060 起步)
- 磁盘: 100 GB

### 推荐配置

- CPU: 8 核 (Intel i7 / AMD Ryzen 7)
- 内存: 32 GB
- GPU: NVIDIA 12GB+ (RTX 4070 / 4080)
- 磁盘: 200 GB SSD
- 网络: 100 Mbps

## 目录结构

```
deploy/
├── docker-compose.yaml   # 完整编排
├── backend.yaml          # 后端服务定义
└── web.yaml              # 前端 nginx 服务
```

## 单独部署

```bash
# 只启动 AI 服务
docker-compose up -d heygem-tts heygem-f2f heygem-asr

# 只启动后端(需 AI 服务已起)
docker-compose up -d backend

# 只启动前端(需后端已起)
docker-compose up -d web
```

## 数据持久化

部署前创建数据卷:

```bash
mkdir -p /root/heygem_data/voice/data
mkdir -p /root/heygem_data/face2face/temp
mkdir -p /root/heygem_data/asr/runtime-resources/models
```

## 环境变量

### 后端

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TZ` | 时区 | `Asia/Shanghai` |
| `VIDEO_SYNTH_HOST` | 视频合成服务地址 | `172.16.90.175` |
| `VOICE_CLONE_HOST` | 声音克隆服务地址 | `172.16.90.175` |

### 前端

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TZ` | 时区 | `Asia/Shanghai` |

## GPU 配置

确保已安装 NVIDIA Docker Runtime:

```bash
# 安装 nvidia-container-toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

## 故障排查

### GPU 不可用

```bash
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

### 端口冲突

修改 `docker-compose.yaml` 中的 `ports` 映射。

### 磁盘空间不足

清理临时文件:

```bash
rm -rf /root/heygem_data/face2face/temp/*
```

## 许可

[MIT License](../LICENSE)
