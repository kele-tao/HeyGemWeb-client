# HeyGem Web Frontend (v2)

> AI 数字人创作平台前端 - 基于 Vite + React 18 + TypeScript + TailwindCSS

## ✨ v2 主要变化（对比 v1 单文件版本）

| 项目 | v1 (旧) | v2 (新) |
|------|---------|---------|
| 体积 | 70KB 单文件 + CDN React/Babel (800KB+ dev) | 325KB JS (gzipped 100KB) |
| 加载 | 浏览器跑 Babel 即时编译 | Vite 预编译 |
| React | dev 版 + UMD | production minified |
| Tailwind | CDN JIT 浏览器跑 | 构建时生成 |
| 类型 | 无 | 严格 TypeScript |
| 状态 | Context | Zustand |
| 路由 | 自实现 page state | React Router |
| 通知 | 自实现 timeout | react-hot-toast |
| 图标 | FontAwesome | lucide-react |
| 主题 | 写死 | 暗色模式 + 系统跟随 |
| 进度 | 5s 固定轮询 | 智能轮询 (指数退避) |

## 🛠 开发

```bash
npm install
npm run dev      # http://localhost:8080，自动代理 /api 到 :8000
```

## 📦 构建

```bash
npm run build    # 产物在 dist/
npm run preview  # 本地预览构建产物
```

## 🐳 部署

构建产物 (`dist/`) 是纯静态文件，可被任何 Web 服务器托管。

**Docker Nginx 部署示例** (`deploy/web.yaml`)：

```yaml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    container_name: heygem-nginx
    restart: always
    network_mode: host
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

**nginx.conf** (核心部分)：

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # SPA 路由回退
  location / {
    try_files $uri $uri/ /index.html;
  }

  # 静态资源缓存
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # 后端 API 反代
  location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 300s;
  }

  location /static/,
  location /avatars/ {
    proxy_pass http://127.0.0.1:8000;
  }
}
```

## 🗂 目录结构

```
web/
├── public/              # 静态资源 (favicon 等)
├── src/
│   ├── api/             # 后端 API 封装
│   ├── components/
│   │   ├── feedback/    # Modal / EmptyState / Skeleton / Toast 等
│   │   ├── layout/      # AppLayout (侧边栏 + 顶栏)
│   │   ├── modals/      # 业务模态框
│   │   └── works/       # 列表卡片组件
│   ├── hooks/           # 自定义 hooks
│   ├── i18n/            # 多语言
│   ├── lib/             # 工具函数
│   ├── pages/           # 页面 (Home / Editor / Works / Avatars / Voices)
│   ├── store/           # Zustand 全局状态
│   ├── types/           # TypeScript 类型
│   ├── App.tsx          # 路由
│   ├── main.tsx         # 入口
│   └── index.css        # Tailwind + 设计系统
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```
