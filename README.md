# 心界 MindSphere

系统化自我成长知识库。

## 项目结构

```
心界 MindSphere/
├── index.html               # 主页门户
├── mbti.html                # MBTI 16型人格学习系统
├── nvc.html                 # 非暴力沟通学习系统
├── cbt.html                 # 认知行为疗法学习系统
├── first_principles.html    # 第一性原理学习系统
└── shared/
    └── styles.css           # 共享设计系统
```

## 设计系统

- **背景**: 深石墨 `#08080a`（暗色）/ 暖白 `#fafaf9`（亮色）
- **品牌色**: 暖铜 `#d4a373`
- **字体**: Sora + Noto Sans SC（标题）/ DM Sans + PingFang SC（正文）/ JetBrains Mono（标签）
- **圆角**: 14–18px
- **动效**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **主题切换**: 支持暗色/亮色模式，自动保存偏好到 localStorage

## 如何添加新模块

1. **创建新页面**
   - 复制 `mbti.html` 作为模板
   - 保留 `<link rel="stylesheet" href="shared/styles.css">`
   - 在页面特定 `<style>` 中定义模块强调色：`--accent`, `--accent-light` 等
   - **不要重写 `.sidebar`、`.sidebar-scroll`、`.nav-link` 等侧边栏布局样式**，让 `shared/styles.css` 统一处理，防止导航被顶部遮挡
   - 替换内容为你新模块的知识体系

2. **更新导航**
   - 在 `index.html` 的 Bento Grid（`.bento-grid`）中添加新卡片
   - 在每个现有页面的 `.top-nav` 中添加新链接

3. **更新主页卡片**
   - 为新模块选择 `data-accent` 颜色：`copper` / `teal` / `slate` 或自定义
   - 如需新颜色，在 `shared/styles.css` 中添加对应的 `.bento-card[data-accent="xxx"]` 规则

## 本地预览

```bash
cd cognitive-garden
python3 -m http.server 8080
# 或
npx serve .
```

然后在浏览器中打开 `http://localhost:8080`。
