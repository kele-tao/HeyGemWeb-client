# 贡献指南

感谢你考虑为 HeyGem 做出贡献! 🎉

## 📋 目录

- [行为准则](#行为准则)
- [我能做什么贡献?](#我能做什么贡献)
- [如何报告 Bug](#如何报告-bug)
- [如何提出新功能建议](#如何提出新功能建议)
- [如何提交 Pull Request](#如何提交-pull-request)
- [开发规范](#开发规范)

## 行为准则

参与本项目即表示你同意遵守以下原则:

- 🤝 尊重所有贡献者,不论经验水平、性别、性取向、残疾、外貌、身体尺寸、种族、宗教
- 💬 建设性沟通,不进行人身攻击
- 🌱 接纳新手,帮助他们成长
- 🎯 专注于对社区最有利的事情

## 我能做什么贡献?

### 🐛 报告 Bug

发现 Bug?在提交 Issue 前:

1. **搜索已有 Issue** — 避免重复
2. **使用最新版本** — 确认 Bug 仍然存在
3. **最小化复现** — 准备最简单的复现步骤

Bug 报告请包含:

```markdown
## Bug 描述
简要描述 Bug 是什么

## 复现步骤
1. 进入 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

## 期望行为
应该发生什么

## 实际行为
实际发生了什么

## 环境
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 119]
- Node.js: [e.g. 20.10.0]
- HeyGem 版本: [e.g. v2.0.0]

## 截图
(如适用)
```

### 💡 提出新功能建议

我们欢迎新想法!提交 Feature Request:

1. 描述**问题**而不是解决方案
2. 解释**为什么**这个功能有价值
3. 考虑**替代方案**
4. 描述**使用场景**

### 🔧 提交代码

欢迎 PR!流程见下文。

## 如何提交 Pull Request

### 1. Fork 仓库

点击 GitHub 页面右上角的 "Fork" 按钮。

### 2. 克隆你的 Fork

```bash
git clone https://github.com/your-username/HeyGemWeb-client.git
cd HeyGemWeb-client/web
npm install
```

### 3. 创建分支

```bash
git checkout -b feat/amazing-feature
# 或
git checkout -b fix/annoying-bug
```

### 4. 编写代码

遵循 [开发规范](#开发规范)。

### 5. 验证

```bash
# TypeScript 类型检查
npx tsc --noEmit

# Build 验证
npm run build

# 浏览器测试
npm run dev
# 手动验证功能
```

### 6. 提交

```bash
git add .
git commit -m "feat: 添加某某功能

- 详细描述
- 解决了 #123"
```

**Commit 消息规范**:遵循 [Conventional Commits](https://www.conventionalcommits.org/)

- `feat:` — 新功能
- `fix:` — Bug 修复
- `docs:` — 文档变更
- `style:` — 代码格式(不影响功能)
- `refactor:` — 重构(既不是新功能也不是 Bug 修复)
- `perf:` — 性能优化
- `test:` — 添加测试
- `chore:` — 构建/工具变更

### 7. 推送 & 创建 PR

```bash
git push origin feat/amazing-feature
```

然后在 GitHub 上点击 "Compare & pull request"。

### 8. PR 模板

```markdown
## 描述
这个 PR 做了什么?

## 关联 Issue
Closes #123

## 改动类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档
- [ ] 其他

## 测试
- [ ] TypeScript 通过
- [ ] Build 通过
- [ ] 浏览器手动测试

## 截图
(如适用)
```

### 9. Code Review

维护者会 review 你的代码。请保持耐心,根据反馈调整。

## 开发规范

### TypeScript

- 严格模式,不允许 `any`(除非有充分理由加注释)
- 接口用 `interface`,类型别名用 `type`
- 命名:`PascalCase` 组件,`camelCase` 变量/函数

### React

- 优先函数组件 + Hooks
- 自定义 Hooks 以 `use` 开头
- 组件文件用 `.tsx`,工具/常量用 `.ts`
- 避免不必要的 `useEffect`,能用事件处理器就不要用 effect

### 样式

- 优先 Tailwind 工具类
- 自定义样式用 CSS 变量(定义在 `index.css`)
- 避免内联 `style` 属性(动画除外)
- 响应式:移动优先

### 文件组织

- 一个组件一个文件
- 相关组件放在同一目录
- 复杂组件拆分为多个子文件

### 国际化

- 所有用户可见的字符串必须通过 i18n
- 中英文都要加
- key 命名用 `section.context`(如 `editor.titlePlaceholder`)

### 状态管理

- 全局状态用 Zustand store
- 本地状态用 `useState`
- 派生状态用 `useMemo`
- 异步副作用用自定义 hooks

### 性能

- 大列表用 lazy 加载或分页
- 重组件用 `React.lazy` + `Suspense`
- 图片用适当格式(WebP/AVIF)
- 避免不必要的 re-render

### 可访问性

- 所有交互元素要有 `aria-label`
- 图片要有 `alt`
- 键盘导航要可用
- 颜色对比度要达标(AA 级)

### 提交前

```bash
# 1. 格式化(可选,我们用 prettier 默认配置)
# 2. 类型检查
npx tsc --noEmit
# 3. 构建
npm run build
# 4. 浏览器测试
npm run dev
```

## 🌟 第一次贡献?

不知道从哪里开始?

- 找标有 `good first issue` 的 Issue
- 找标有 `help wanted` 的 Issue
- 改进文档(永远受欢迎)
- 报告你使用中遇到的问题

## 📬 联系方式

- GitHub Issues: 报告 Bug / 提建议
- Discussions: 一般性问题讨论

---

再次感谢你的贡献! ❤️
