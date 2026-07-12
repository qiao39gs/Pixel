# AGENTS.md — 像素拼豆图纸生成器

## 技术栈

- React 19 + TypeScript 5.8 + Vite 6
- Tailwind CSS v4（通过 `@tailwindcss/vite` 插件，无 `tailwind.config.js`）
- Zustand v5（唯一 store：`src/store/workspaceStore.ts`）
- jsPDF（A4 多页 PDF 导出）
- Pollinations img2img API（AI 图像增强，通过 Vercel serverless 代理）
- 前端纯客户端，AI 增强依赖 Vercel serverless 函数（`api/enhance.ts`）

## 开发命令

```bash
npm install          # npm 包管理器，非 yarn/pnpm
npm run dev          # Vite 开发服务器，端口 3000，--host=0.0.0.0（纯前端，AI 增强不可用）
npm run lint         # 仅 tsc --noEmit（类型检查，不是代码风格 lint）
npm run build        # vite build 生产构建
npm run preview      # 预览生产构建，端口 3000
```

> AI 图像增强依赖 Vercel serverless 函数 (`api/enhance.ts`)，本地开发需使用 `vercel dev` 替代 `npm run dev`。

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
│   ├── useImageEnhancement.ts # AI 图像增强（Pollinations img2img 预处理）
│   └── useCanvasRenderer.ts   # Canvas 离屏渲染
├── services/
│   └── pollinationsApi.ts     # Pollinations API 客户端封装 + prompt 构建
├── components/
│   ├── ImageUploader.tsx       # 图片上传/裁剪/缩放/旋转
│   ├── PatternWorkspace.tsx    # 主工作区编排器
│   └── workspace/
│       ├── ControlPanel.tsx    # 左面板：预设、滑块、算法、AI 增强、导出
│       ├── CanvasViewport.tsx  # 画布显示 + 编辑交互
│       ├── StatsPanel.tsx      # 底部统计：颜色用量、换色面板
│       └── ProjectPanel.tsx    # 右面板：项目画廊、JSON 导入导出
├── utils/
│   ├── exportUtils.ts      # 高分辨率 PNG + A4 多页 PDF（jsPDF）
│   ├── editOperations.ts   # 泛洪填充、降噪、自动裁剪
│   ├── statsUtils.ts       # 耗材统计重算
│   ├── kMedoids.ts         # k-medoids 贪心选色优化
│   ├── projectStorage.ts   # 项目 localStorage 持久化 & JSON 导入导出
│   └── constants.ts        # ASPECT_RATIOS、EMPTY_BEAD 等常量
api/
└── enhance.ts              # Vercel serverless 函数：代理 Pollinations img2img API
docs/
└── adr/                    # 架构决策记录
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
- **AI 图像增强**：`useImageEnhancement` hook 监听 `aiEnhanceOptions` 变化 → 客户端压缩图片至 1024px → 调用 Vercel serverless (`api/enhance.ts`) 代理 Pollinations img2img API → 返回增强后图片进入主处理管线。API Key 仅存于服务端，客户端不可见
- **颜色匹配算法**：支持 CIEDE2000 / CIE94 / CIE76 / WeightedRGB 四种，通过 Lab 色彩空间转换实现
- **导出**：PNG 使用 Canvas API 本地渲染（`generateHighResPng`），暖纸底艺术化排版——耗材按色卡系列分组排列，圆形色卡标注色号与所需数量，画布高度动态紧贴内容；PDF 使用 jsPDF（`generateMultiPagePdf`），按每页 29×29 网格分块，自动分页
- **移动端适配**：`mobileTab` 状态控制四面板切换（controls/canvas/stats/projects），条件渲染当前 Tab 面板（非 `hidden` 隐藏）以消除间距差异；编辑模式下支持拖拽平移、悬浮工具栏、"…"展开编辑工具、还原视图按钮；支持双指缩放和触摸编辑
- **裁剪修整**：支持四边手动调节滑块 + `autoDetectTrim` 自动检测有效像素边界

## 环境变量

- `DISABLE_HMR=TRUE` — 在 AI 代理编辑环境下禁用 Vite HMR，避免频繁刷新（`vite.config.ts`）
- `POLLINATIONS_API_KEY` — AI 图像增强所需的 Pollinations API Key，仅配置在 Vercel 项目设置的 Environment Variables 中，服务端可见，客户端不可见

## Tailwind CSS v4 注意

- 主题自定义在 `src/index.css` 中通过 `@theme` 块定义
- 自定义字体：`--font-sans: "DM Sans"`、`--font-display: "Syne"`、`--font-mono: "JetBrains Mono"`
- 品牌色：`--color-brand-ink: #18181B`、`--color-brand-accent: #E8570A`、`--color-brand-bg: #FAFAF7`
- 无 `tailwind.config.js` 文件，不要创建

## Git

- 远端：`https://github.com/qiao39gs/Pixel.git`
- 仅在 `main` 单分支上开发，无 CI/CD 配置
