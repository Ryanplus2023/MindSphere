# 心界 MindSphere

> 系统化自我成长知识库 — 把心理学、哲学、决策科学，整理成一个可以反复回望、持续生长的认知体系。

## 项目结构

```
心界 MindSphere/
├── index.html               # 主页门户（Hero + 设计理念 + 学习模块 + 认知地图）
├── mbti.html                # MBTI 16 型人格学习系统
├── nvc.html                 # 非暴力沟通学习系统
├── cbt.html                 # 认知行为疗法学习系统
├── stoicism.html            # 斯多葛主义生活哲学学习系统
├── first_principles.html    # 第一性原理学习系统
├── canon.html               # 正典书架（按模块组织的策展书单）
├── flashcards.html          # SRS 间隔重复记忆卡片系统
├── shared/
│   └── styles.css           # 共享设计系统（含 footer 组件）
├── assets/                  # 静态资源
└── README.md
```

## 设计系统

- **背景**：深石墨 `#08080a`（暗色）／暖白 `#fafaf9`（亮色）
- **品牌色**：暖铜 `#d4a373`
- **字体**：
  - 中文标题 **Noto Serif SC**
  - 英文标题 **Sora**
  - 正文 **DM Sans + PingFang SC**
  - Mono 标签 **JetBrains Mono**
- **圆角**：14–18px
- **动效曲线**：`cubic-bezier(0.4, 0, 0.2, 1)`
- **主题切换**：支持暗 / 亮模式，自动保存偏好到 `localStorage`

## 本地预览

```bash
# 任选其一
python3 -m http.server 8080
npx serve .
```

然后浏览器打开 <http://localhost:8080>。

## 部署到 GitHub Pages

1. 推送到 GitHub 仓库
2. 仓库 **Settings → Pages**
3. Source 选 **Deploy from a branch**，分支选 `main` / `/(root)`
4. 等 1–2 分钟，顶部会显示部署地址

## 如何添加新模块

1. **创建新页面**
   - 复制 `mbti.html` 作为模板
   - 保留 `<link rel="stylesheet" href="shared/styles.css">`
   - 在页面 `<style>` 中定义模块强调色：`--accent`、`--accent-light`
   - **不要**重写 `.sidebar`、`.sidebar-scroll`、`.nav-link` 等侧边栏布局样式

2. **更新主页 Bento Grid**
   - 在 `index.html` 的 `.bento-grid` 中添加新卡片
   - 为新模块指定 `data-accent`：`copper` / `teal` / `slate` / `indigo` / `rose` / `sand`
   - 同步更新 `认知地图` 区块的节点

3. **更新顶部导航**
   - 在每个页面的 `.top-nav` 中加入新链接

---

© 2026 心界 MindSphere · Vol. 01
