# AGENTS.md

本文件面向参与此仓库开发的代码代理和开发者，记录必须遵守的命令、架构边界与验证要求。面向用户的项目介绍和使用方法见 [`README.md`](./README.md)。

## 项目概览

像素拼豆图纸生成器是一个 React 单页应用。核心图像处理、编辑和持久化逻辑在浏览器中运行；AI 图像增强通过 Vercel Function 代理 Pollinations img2img API。

## 技术栈

- React 19、TypeScript 5.8、Vite 6
- Tailwind CSS v4，通过 `@tailwindcss/vite` 集成
- Zustand 5，唯一全局 store 为 `src/store/workspaceStore.ts`
- Canvas API、jsPDF、IndexedDB
- Vercel Functions、Pollinations img2img API

## 开发命令

使用 npm，不要使用 yarn 或 pnpm。

| 命令 | 说明 |
| --- | --- |
| `npm install` | 安装依赖 |
| `npm run dev` | 在 3000 端口启动 Vite；AI 增强不可用 |
| `vercel dev` | 启动前端和 `api/enhance.ts`，用于调试 AI 增强；需预先安装并登录 Vercel CLI |
| `npm run lint` | 执行 `tsc --noEmit`，仅进行类型检查 |
| `npm run build` | 生成 Vite 生产构建 |
| `npm run preview` | 在 3000 端口预览生产构建 |

仓库当前没有 Jest、Vitest 等测试框架，也没有 ESLint、Prettier 或 Biome。不要把 `npm run lint` 描述为代码风格检查。

## 核心目录职责

```text
.
├── api/
│   └── enhance.ts                       # Pollinations img2img 服务端代理
├── src/
│   ├── App.tsx                          # 上传/工作区切换、草稿恢复、导出入口
│   ├── main.tsx                         # ReactDOM 入口
│   ├── index.css                        # Tailwind 主题、设计令牌、全局样式
│   ├── types.ts                         # 共享领域类型
│   ├── colorUtils.ts                    # RGB/Lab 转换和四种色差算法
│   ├── data/palette.ts                  # MARD 221 色标准色卡；内部品牌标识为 MGB
│   ├── store/workspaceStore.ts          # 唯一 Zustand store 和编辑器 adapter
│   ├── hooks/
│   │   ├── useImageProcessing.ts        # 图片加载与量化结果写回
│   │   ├── useImageEnhancement.ts       # AI 增强状态与覆盖确认
│   │   ├── useCanvasRenderer.ts         # Canvas 离屏渲染
│   │   └── useProjectSafety.ts          # 脏状态、草稿、保存和离开保护
│   ├── services/pollinationsApi.ts      # AI 客户端、压缩和 prompt 构建
│   ├── components/
│   │   ├── ImageUploader.tsx            # 上传、预览、变换和裁剪
│   │   ├── PatternWorkspace.tsx         # 工作台编排和键盘快捷键
│   │   └── workspace/                   # 工具栏、画布、抽屉、色板和项目 UI
│   └── utils/
│       ├── quantizeImage.ts             # 量化处理纯函数
│       ├── patternEditor.ts             # 编辑事务、快照、撤销和裁剪
│       ├── pointerInteraction.ts        # 指针交互状态机
│       ├── beadSpriteCache.ts           # 画布拼豆精灵缓存
│       ├── renderLayout.ts              # Canvas/PDF 共用渲染意图
│       ├── exportUtils.ts               # PNG 和 PDF adapter
│       ├── editOperations.ts            # EMPTY_BEAD 和泛洪填充
│       ├── statsUtils.ts                # 耗材统计重算
│       ├── kMedoids.ts                  # k-medoids 选色优化
│       ├── projectStorage.ts            # IndexedDB、草稿和 JSON 校验
│       └── constants.ts                 # 比例等常量
├── README.md                            # 用户文档
├── package.json
└── vite.config.ts
```

## 架构边界

### 状态与编辑器

- 所有全局 UI 和工作区状态集中在 `workspaceStore.ts`，不要新增第二个全局 store。
- 画笔、橡皮擦、魔棒、换色、去杂色和裁剪等编辑操作应放在 `PatternEditor` 或相关深层工具模块中。
- `PatternEditor` 是像素、统计、网格尺寸和撤销历史的编辑真源。Store action 调用编辑器后，通过 `snapshotEditor()` 将快照同步到 Zustand；不要绕过编辑器独立写入这些领域状态。
- `PatternEditor` 的撤销栈上限为 50 步，由 `patternEditor.ts` 的 `UNDO_LIMIT` 控制。
- 编辑操作的撤销快照由 `PatternEditor` 统一负责。调用方不得在内部已创建快照的操作前重复 `pushUndo()`；连续画笔必须成对开始和结束笔画事务。

### 图像处理管线

- `quantizeImage.ts` 是量化管线的纯函数核心，负责采样、色彩调整、颜色匹配、限色重匹配和 k-medoids。
- `useImageProcessing.ts` 仅负责图片加载、调用量化函数和写回 store，不要把计算逻辑重新堆回 hook。
- 管线调度统一使用 `PipelineMode`：`process`、`skipOnce`、`skipAndHold`、`paused`。不要重新引入分散的布尔调度标志。
- 支持的颜色匹配算法为 CIEDE2000、CIE94、CIE76 和 Weighted RGB。

### 指针交互

- `PointerInteraction` 使用 `idle`、`panning`、`pinch` 主状态，并通过画笔拖动、触摸起点和长按计时器等内部字段管理编辑手势。
- `CanvasViewport.tsx` 负责把鼠标、触摸和滚轮事件委派给状态机，不要在组件内复制一套手势状态。
- 组件卸载时必须调用 `PointerInteraction.destroy()`，清理长按计时器并结束未完成的笔画事务。
- 修改交互时必须同时考虑桌面鼠标和移动端触摸行为。

### 渲染与导出

- `renderLayout.ts` 定义 `RenderAdapter` 以及 `renderGrid`、`renderGridChunk`，集中描述像素、网格线、参考线、标尺、色号和外框。
- PNG 导出使用 Canvas adapter 和 `renderGrid()`；PDF 导出使用 jsPDF adapter 和 `renderGridChunk()`。两种导出的共用网格语义集中在 `renderLayout.ts`，不要分别复制。
- 实时工作区画布由 `useCanvasRenderer.ts` 独立分层绘制，并使用 `beadSpriteCache.ts`。修改公共视觉规则时，需要同时评估实时画布与导出结果。
- PNG 可包含耗材面板；PDF 包含封面、分页、耗材清单和页脚说明。
- 导出抽屉还支持将当前耗材用量按系列分组复制为纯文本。

### 项目持久化

- 项目数据存储在 IndexedDB，`projectStorage.ts` 负责 CRUD、自动草稿、旧 `localStorage` 迁移，以及 JSON 导入的尺寸、设置和像素数量校验。
- 修改持久化结构时，必须明确考虑已保存项目和草稿的兼容性。
- 修改 IndexedDB object store、keyPath 或记录结构时，评估是否递增数据库版本并实现升级迁移；修改 JSON 格式时，同步更新导出版本和导入兼容逻辑。不要混淆两种版本号。
- JSON 新格式使用色号重建当前色卡，未知色号会退化为空格；旧对象像素格式是兼容入口，处理时应视为不可信输入。
- 参数重算、AI 增强或其他会覆盖手工编辑的操作必须保留确认保护。

### AI 增强

- 客户端通过 `src/services/pollinationsApi.ts` 请求 `/api/enhance`。
- `api/enhance.ts` 是唯一 Pollinations 服务端代理；API Key 不得写入客户端代码、日志或提交记录。
- 客户端会把图片预处理到最长边 1024px，增强结果再进入主量化管线。

## 样式与响应式约定

- Tailwind CSS v4 主题定义在 `src/index.css` 的 `@theme` 中。
- 不存在 `tailwind.config.js`，不要创建该文件。
- 字体令牌：`--font-sans` 为 DM Sans，`--font-display` 为 Syne，`--font-mono` 为 JetBrains Mono。
- 品牌色：`--color-brand-ink: #18181B`、`--color-brand-accent: #E8570A`、`--color-brand-bg: #FAFAF7`。
- 保持现有暖白、墨黑和品牌橙的视觉语言，不要引入无关的主色体系。
- UI 变更必须检查桌面和移动端。移动端使用侧抽屉、底部工具坞、色板浮层和 Safe Area 布局。

## 编码约定

- UI 文本、README、项目说明和提交信息使用中文。
- 提交信息不使用 Conventional Commits 前缀，例如 `feat:` 或 `fix:`。
- 默认使用相对路径导入。`@/*` 映射到项目根目录 `./*`，不是 `src/*`。
- 以最小正确改动为优先，不要无依据增加兼容层或重复抽象。
- 不要提交 API Key、图片测试素材、构建产物或本地环境文件。

## 环境变量

| 变量 | 使用位置 | 说明 |
| --- | --- | --- |
| `POLLINATIONS_API_KEY` | Vercel 服务端 | Pollinations API Key，仅 `api/enhance.ts` 读取 |
| `VITE_ENABLE_AI` | Vite 客户端构建 | AI 功能开关，精确设为 `false` 时隐藏图纸参数面板中的 AI 功能，未设置时默认开启 |
| `DISABLE_HMR` | Vite 开发环境 | 启动 Vite 前设为精确字符串 `true`，禁用 HMR 和文件监听 |

`DISABLE_HMR` 直接从启动进程的环境变量读取，值必须精确为小写字符串 `true`，其他值均视为未禁用。

## 验证要求

完成代码改动后至少执行：

```bash
npm run lint
npm run build
```

`vite build` 不执行完整 TypeScript 类型检查，不能替代 `npm run lint`。当前 `tsconfig.json` 未启用 `strict`，不要把结果描述为严格类型验证。

涉及界面或交互时，还应在浏览器中检查：

- 桌面与移动端没有横向溢出。
- 上传、裁剪、工作台和导出流程仍可使用。
- 浏览器控制台没有新增错误。
- 鼠标和触摸交互没有明显回归。

仓库没有自动化测试，因此不要宣称“测试通过”；应准确说明类型检查、构建和手工验证的结果。

## Git

- 远端仓库：<https://github.com/qiao39gs/Pixel.git>
- 默认基线分支为 `main`；提交或创建 PR 前，以实际 Git 状态和远端默认分支为准。
- 仓库当前没有 CI/CD 配置。
- 提交前检查 `git status` 和完整差异，只暂存与当前任务相关的文件。
