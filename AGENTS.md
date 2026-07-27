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
├── App.tsx              # 根组件：上传/工作区切换 + 草稿恢复
├── main.tsx             # ReactDOM 入口
├── types.ts             # BeadPaletteItem, TransformedPixel, IngredientStat
├── index.css            # Tailwind v4 @import + @theme（字体、颜色、动画）
├── colorUtils.ts        # hexToRgb, rgbToLab, deltaE76/94/2000/WeightedRGB
├── data/palette.ts      # MARD 221 色标准色卡 + COLOR_GROUPS
├── store/workspaceStore.ts  # Zustand 全局状态 + PipelineMode + 脏状态/保存状态/手动编辑标志
├── hooks/
│   ├── useImageProcessing.ts  # adapter：加载 Image → 调 quantizeImage → 写回 store
│   ├── useImageEnhancement.ts # AI 图像增强（Pollinations img2img 预处理），含手工编辑覆盖确认
│   ├── useCanvasRenderer.ts   # Canvas 离屏渲染
│   └── useProjectSafety.ts   # 项目安全网：脏状态、自动草稿、Ctrl+S、离开保护
├── services/
│   └── pollinationsApi.ts     # Pollinations API 客户端封装 + prompt 构建
├── components/
│   ├── ImageUploader.tsx       # 图片上传/裁剪/缩放/旋转（预览层与输出层分离）
│   ├── PatternWorkspace.tsx    # 主工作区编排器 + 键盘快捷键
│   └── workspace/
│       ├── EditorFrame.tsx      # 全屏编辑器骨架 + CSS 变量安全区布局
│       ├── TopToolbar.tsx       # 顶部居中工具栏
│       ├── CanvasViewport.tsx   # 画布显示 + 笔画事务 + 指针交互委派给 PointerInteraction
│       ├── ToolHint.tsx         # 桌面/移动端分端操作提示
│       ├── LeftDrawer.tsx       # 左侧参数抽屉（规格/调整/AI/裁剪/视图五页签）
│       ├── ControlSections.tsx  # 左面板内容：滑块、开关、算法、规格
│       ├── RightStatsPanel.tsx  # 右侧色卡抽屉框架
│       ├── StatsPanel.tsx       # 色卡耗材统计：换色/相似度/拖拽
│       ├── PalettePanel.tsx     # 完整色卡选择浮层
│       ├── ProjectDrawer.tsx    # 项目抽屉模态框
│       ├── ProjectPanel.tsx     # 项目列表：IndexedDB 异步 CRUD + 状态反馈
│       ├── ProjectStatus.tsx    # 左上角项目保存状态指示器
│       ├── MobileToolbar.tsx    # 移动端底部编辑工具坞
│       ├── ZoomControls.tsx     # 缩放控件 + 适应画布
│       └── Toasts.tsx           # Toast 消息提示
├── utils/
│   ├── quantizeImage.ts    # 量化管线深模块：采样+色彩调整+匹配+限色+k-medoids 一体纯函数
│   ├── patternEditor.ts    # 图纸编辑器深模块：笔画事务 + 宽高感知快照
│   ├── pointerInteraction.ts # 画布指针交互模块：显式状态机（idle/panning/brushing/pinch/longPress）
│   ├── renderLayout.ts     # 导出渲染布局模块：RenderAdapter 接口 + renderGrid/renderGridChunk
│   ├── exportUtils.ts      # PNG + PDF 导出（PDF adapter 完整状态栈与文字对齐）
│   ├── editOperations.ts   # EMPTY_BEAD 常量 + floodFill 泛洪填充
│   ├── statsUtils.ts       # 耗材统计重算
│   ├── kMedoids.ts         # k-medoids 贪心选色优化
│   ├── projectStorage.ts   # IndexedDB 项目持久化 + 旧 localStorage 迁移 + 严格校验
│   └── constants.ts        # ASPECT_RATIOS 等常量
api/
└── enhance.ts              # Vercel serverless 函数：代理 Pollinations img2img API
```

## 路径别名

- `@/*` 映射到项目根目录（`./*`），非 `src/*`
- 目前代码中使用的是相对路径导入，风格到此保持即可

## 重要约定

- UI 文本、commit message 均为中文
- commit 不使用 conventional commit 前缀（无 `feat:`, `fix:`）
- 项目描述、README 文档均为中文
- PatternEditor 的撤销栈上限为 50 步（`patternEditor.ts` 的 `UNDO_LIMIT` 常量）

## 架构要点

- **状态管理**：单一 Store，所有 UI 状态集中在 `workspaceStore.ts`。编辑操作（画笔、橡皮、魔棒、换色、降噪、裁剪）委托给 `PatternEditor` 深模块，store 通过 `snapshotEditor()` 单向同步编辑器状态到 store 字段供 React 订阅
- **管线调度**：三布尔标志位（`pipelineActive`/`skipNextProcess`/`restoringProject`）已合并为 `pipelineMode: PipelineMode` 枚举（`process`/`skipOnce`/`skipAndHold`/`paused`），`loadProject` 一次性设 mode，hook 消费后自动转回
- **图像处理管线**：`quantizeImage` 深模块（纯函数，吃 `ImageData` + 预计算色卡 + options，吐 `{ pixels, stats, gw, gh }`）统管采样 + 色彩调整 + 匹配 + 限色重匹配 + k-medoids；`useImageProcessing` hook 退化为 ~90 行 adapter，仅负责图片加载与结果写回
- **AI 图像增强**：`useImageEnhancement` hook 监听 `aiEnhanceOptions` 变化 → 客户端压缩图片至 1024px → 调用 Vercel serverless (`api/enhance.ts`) 代理 Pollinations img2img API → 返回增强后图片进入主处理管线。API Key 仅存于服务端，客户端不可见
- **颜色匹配算法**：支持 CIEDE2000 / CIE94 / CIE76 / WeightedRGB 四种，通过 Lab 色彩空间转换实现
- **画布指针交互**：`PointerInteraction` 类拥有显式状态机（idle/panning/brushing/pinch/longPress），持有长按定时器、捏合几何、画笔去重集；`CanvasViewport` 组件通过 `onMouseDown/Move/Up` + `onTouchStart/Move/End` + `onWheel` 委派
- **导出**：`renderLayout` 模块定义 `RenderAdapter` 接口（渲染原语）+ `renderGrid`/`renderGridChunk`（描述"画什么"）；Canvas 和 jsPDF 各实现一个 adapter，6 项共用渲染意图（像素块/网格线/5-10参考线/标尺/色号文字/外框）集中一处；PNG 独有耗材面板，PDF 独有封面/分页/页脚说明
- **移动端适配**：侧面板转为遮罩抽屉、参数/色卡互斥、底部编辑工具栏、色板浮层、Safe Area 适配；编辑模式下支持拖拽平移、双指缩放、长按取色、操作提示
- **裁剪修整**：`PatternEditor.detectBounds` 检测有效像素边界 + `PatternEditor.trim` 执行裁剪，store 的 `autoDetectTrim`/`applyTrim` action 退化为薄 adapter

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
