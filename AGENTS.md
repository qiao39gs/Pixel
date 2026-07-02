# AGENTS.md — 像素拼豆图纸生成器

## 技术栈

- React 19 + TypeScript 5.8 + Vite 6
- Tailwind CSS v4（通过 `@tailwindcss/vite` 插件，无 `tailwind.config.js`）
- Zustand v5（唯一 store：`src/store/workspaceStore.ts`）
- jsPDF（A4 多页 PDF 导出）
- 纯客户端应用，无路由、无后端、无 API 调用

## 开发命令

```bash
npm install          # npm 包管理器，非 yarn/pnpm
npm run dev          # Vite 开发服务器，端口 3000，--host=0.0.0.0
npm run lint         # 仅 tsc --noEmit（类型检查，不是代码风格 lint）
npm run build        # vite build 生产构建
npm run preview      # 预览生产构建，端口 3000
```

**注意**：没有测试框架（无 Jest/Vitest），没有代码格式化工具（无 ESLint/Prettier/Biome）。`lint` 就是类型检查。

## 项目结构

```
src/
├── App.tsx              # 根组件：上传/工作区切换
├── main.tsx             # ReactDOM 入口
├── types.ts             # BeadPaletteItem, TransformedPixel, IngredientStat
├── index.css            # Tailwind v4 @import + @theme（字体、颜色、动画）
├── colorUtils.ts        # hexToRgb, rgbToLab, deltaE76/94/2000/WeightedRGB
├── data/palette.ts      # MARD 221 色标准色卡 + COLOR_GROUPS
├── store/workspaceStore.ts  # Zustand 全局状态（~30 字段，含撤销栈 上限 50）
├── hooks/
│   ├── useImageProcessing.ts  # 像素采样 + 颜色匹配管线
│   └── useCanvasRenderer.ts   # Canvas 离屏渲染
├── components/
│   ├── ImageUploader.tsx       # 图片上传/裁剪/缩放/旋转
│   ├── PatternWorkspace.tsx    # 主工作区编排器
│   └── workspace/
│       ├── ControlPanel.tsx    # 左面板：预设、滑块、算法、导出
│       ├── CanvasViewport.tsx  # 画布显示 + 编辑交互
│       └── StatsPanel.tsx      # 底部统计：颜色用量、换色面板
└── utils/
    ├── exportUtils.ts      # 高分辨率 PNG + A4 多页 PDF（jsPDF）
    ├── editOperations.ts   # 泛洪填充、降噪、自动裁剪
    └── statsUtils.ts       # 耗材统计重算
```

## 路径别名

- `@/*` 映射到项目根目录（`./*`），非 `src/*`
- 目前代码中使用的是相对路径导入，风格到此保持即可

## 重要约定

- UI 文本、commit message 均为中文
- commit 不使用 conventional commit 前缀（无 `feat:`, `fix:`）
- 项目描述、README 文档均为中文
- Zustand store 的撤销栈上限为 50 步（`workspaceStore.ts` 的 `UNDO_LIMIT` 常量）

## 架构要点

- **状态管理**：单一 Store，所有状态集中在 `workspaceStore.ts`。编辑操作（画笔、橡皮、魔棒、换色、降噪、裁剪）都在 store action 中实现，同步操作撤销栈
- **图像处理管线**：`useImageProcessing` hook 监控参数变化 → 在 offscreen canvas 上采样源图 → 逐像素匹配 MARD 色卡（默认 CIEDE2000 色彩距离）→ 若超过 `colorLimit` 则二次只使用 top-N 色号重匹配
- **颜色匹配算法**：支持 CIEDE2000 / CIE94 / CIE76 / WeightedRGB 四种，通过 Lab 色彩空间转换实现
- **导出**：PNG 使用 Canvas API 本地渲染（`generateHighResPng`），PDF 使用 jsPDF（`generateMultiPagePdf`），按每页 29×29 网格分块，自动分页
- **移动端适配**：`mobileTab` 状态控制三面板切换（controls/canvas/stats），支持双指缩放和触摸编辑
- **裁剪修整**：支持四边手动调节滑块 + `autoDetectTrim` 自动检测有效像素边界

## 环境变量

- `DISABLE_HMR=TRUE` — 在 AI 代理编辑环境下禁用 Vite HMR，避免频繁刷新（`vite.config.ts`）

## Tailwind CSS v4 注意

- 主题自定义在 `src/index.css` 中通过 `@theme` 块定义
- 自定义字体：`--font-sans: "DM Sans"`、`--font-display: "Syne"`、`--font-mono: "JetBrains Mono"`
- 品牌色：`--color-brand-ink: #18181B`、`--color-brand-accent: #E8570A`、`--color-brand-bg: #FAFAF7`
- 无 `tailwind.config.js` 文件，不要创建

## Git

- 远端：`https://github.com/qiao39gs/Pixel.git`
- 仅在 `main` 单分支上开发，无 CI/CD 配置
