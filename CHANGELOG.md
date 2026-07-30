# 更新日志

HeyGem 的所有重要变更都会记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中

- AI 脚本助手(LLM 集成)
- BGM 背景音乐库
- 字幕自动生成
- 团队空间与协作
- 鉴权与权限系统

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
- **i18n 中英文** — 完整覆盖
- **错误边界** — 全局 ErrorBoundary + 友好重试页
- **路由守卫** — /editor 必须先有数字人
- **404 页面** — 极光渐变 + 浮动 3D 元素
- **响应式** — 移动端单栏 + 桌面三栏
- **SEO meta** — title / description / og / twitter
- **顶部欢迎 Hero** — 首次访问自动展示
- **数据看板** — 4 张统计卡 + 7 天趋势图 + Top3 热门模特
- **快捷操作** — 3 个渐变大按钮
- **作品分类** — 自动从脚本关键词推断 + 手动筛选
- **最近使用预填** — 记住上次用的模特和声音
- **全屏模态框** — 上传/试听/详情/诊断/确认/模板选择
- **微动效** — 撒花庆祝、计数动画、波形动画、卡片光泽

### 🔧 改进

- **性能优化** — 主包从 800KB 降至 308KB
- **代码分割** — 路由级 + 组件级 lazy
- **类型守卫** — store 数据校验
- **错误处理** — 所有 API 调用都有 try/catch
- **localStorage 容错** — 失败静默处理
- **键盘导航** — 模态框 ESC 关闭 / 焦点管理
- **a11y** — aria-label / role / aria-modal
- **降级** — 后端不可用时仍能使用

### 🗑️ 移除

- Babel Standalone 浏览器编译
- FontAwesome 全部图标
- 单文件 HTML 入口
- CDN Tailwind JIT
- react.development.js (改用 production minified)

### 🐛 Bug 修复

- 视频卡 hover 预览在模特删除后不再 404
- 离开编辑器不再丢失脚本
- 表单重复提交防护
- 模态框打开时禁止 body 滚动
- 浏览器关闭时未保存工作提醒
- iOS Safari viewport 适配

## [1.0.0] - 2024-XX-XX

### 初版

- 单文件 HTML 入口
- React 18 + Babel Standalone
- 基础功能:模特/声音/合成
- 中文界面
- 后端 FastAPI 微服务架构

---

[Unreleased]: https://github.com/kele-tao/HeyGemWeb-client/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/kele-tao/HeyGemWeb-client/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/kele-tao/HeyGemWeb-client/releases/tag/v1.0.0
