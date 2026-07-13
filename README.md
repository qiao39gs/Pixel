# 像素拼豆图纸生成器

> Pixel Bead Pattern Generator — v1.0.4

纯浏览器端运行，上传图片 → 生成拼豆像素网格图纸。MARD 标准色卡匹配、CIEDE2000 色差体系、手动编辑、项目持久化、A4 分页 PDF 导出、AI 图像增强。

---

## 功能

- **图片上传裁切** — 1:1 / 4:3 / 3:4 / 16:9 / 9:16 / 自动比例裁切，拖拽旋转缩放
- **智能色卡匹配** — CIEDE2000 空间色差算法，最近邻像素映射到 MARD 221 色标准色卡，限色后二次重匹配仅使用精选色号
- **智能选色优化 (k-medoids)** — 可选开关，以量化误差最小为准则从色卡精选色号，替代默认频次选取；渐变/照片类图色彩还原更均衡，复用用户选定的色差算法
- **亮度/对比度/饱和度调节** — 松手后触发图像重处理，避免频繁渲染
- **AI 图像增强** — 通过 Pollinations 图生图 API 在源图进入拼豆管线前进行简化/降噪预处理；三档简化强度（轻度/中度/强烈）、扁平化颜色与卡通风格可选、自定义 prompt 追加
- **裁边修整** — 自动裁剪四边空白 + 四方向滑块手动精调边距
- **画布滚轮缩放** — 桌面端滚轮以鼠标位置为中心缩放画布，双指捏合移动端缩放
- **换色面板** — 已有色独立置顶分组、环形占比图、拖拽快速换色、系列快捷导航
- **格子级手动编辑** — 画笔、橡皮擦、魔棒批量选区（4 连通）、去杂色、撤销（Ctrl+Z）、重做（Ctrl+Shift+Z / Ctrl+Y）
- **项目保存/加载/画廊** — 独立右侧项目面板，缩略图列表展示，localStorage 持久化，支持重命名、删除、新建
- **JSON 导入/导出** — 项目文件可导出为 JSON 离线备份，支持导入恢复
- **移动端适配** — 四段式 tab 导航（参数/画布/色卡/项目）、条件渲染消除 Tab 间距差异、编辑模式拖拽平移 + 悬浮工具栏 + 还原视图按钮、长按取色、色卡长按拖拽换色、双指捏合缩放
- **高清 PNG 导出** — 暖纸底艺术化排版，耗材按色卡系列分组排列，圆形色卡标注色号与所需数量，画布高度动态紧贴内容
- **A4 分页 PDF 导出** — 大尺寸图纸自动切板分页

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand |
| 图标 | Lucide React |
| 色差算法 | CIEDE2000 / CIE94 / CIE76 / WeightedRGB |
| AI 增强 | Pollinations img2img API（Vercel serverless 代理） |
| 导出 | jsPDF + Canvas API |
| 持久化 | localStorage |
| 字体 | Syne / DM Sans / JetBrains Mono |

---

## 项目结构

```
src/
├── App.tsx                              # 主应用入口
├── main.tsx
├── index.css                            # Tailwind + 自定义样式
├── types.ts                             # 类型定义
├── colorUtils.ts                        # 色彩空间转换 & 色差公式
├── vite-env.d.ts                        # Vite 环境变量类型声明
├── store/
│   └── workspaceStore.ts               # Zustand 全局状态 + PipelineMode 枚举
├── hooks/
│   ├── useImageProcessing.ts           # 图像处理 adapter：加载图片 → 调 quantizeImage → 写回 store
│   ├── useImageEnhancement.ts          # AI 图像增强
│   └── useCanvasRenderer.ts            # Canvas 离屏渲染
├── services/
│   └── pollinationsApi.ts              # Pollinations API 客户端封装 + prompt 构建
├── components/
│   ├── ImageUploader.tsx               # 图片上传 & 裁切
│   ├── PatternWorkspace.tsx            # 工作台主组件
│   └── workspace/
│       ├── ControlPanel.tsx             # 左侧控制面板
│       ├── CanvasViewport.tsx           # 画布视口 + 指针交互委派
│       ├── StatsPanel.tsx               # 底部色卡用量统计
│       └── ProjectPanel.tsx             # 右侧项目管理面板
├── data/
│   └── palette.ts                       # MARD 221 色标准色卡
└── utils/
    ├── quantizeImage.ts                 # 量化管线：采样+色彩调整+匹配+限色+k-medoids
    ├── patternEditor.ts                 # 图纸编辑器：统管 pixels+stats+undo/redo
    ├── pointerInteraction.ts            # 画布指针交互状态机
    ├── renderLayout.ts                  # 导出渲染布局 + RenderAdapter 接口
    ├── exportUtils.ts                   # PNG & PDF 导出（双 adapter）
    ├── editOperations.ts                # 泛洪填充 + EMPTY_BEAD 常量
    ├── statsUtils.ts                    # 统计计算
    ├── kMedoids.ts                      # k-medoids 贪心选色优化
    ├── projectStorage.ts               # 项目 localStorage 持久化 & JSON 导入导出
    └── constants.ts                     # ASPECT_RATIOS 等常量
api/
└── enhance.ts                           # Vercel serverless 函数：代理 Pollinations img2img API
```

---

## MARD 色卡系列

| 系列 | 色域 | 数量 |
|------|------|------|
| A系列 | 黄/橙/红 | 26 |
| B系列 | 绿 | 32 |
| C系列 | 蓝/青 | 29 |
| D系列 | 紫 | 26 |
| E系列 | 粉/玫红 | 24 |
| F系列 | 红/棕红 | 25 |
| G系列 | 棕/肤色 | 21 |
| H系列 | 黑白灰 | 23 |
| M系列 | 混合/大地色 | 15 |

---

## 开发

```bash
npm install
npm run dev      # http://localhost:3000（纯前端，AI 增强不可用）
npm run lint     # tsc --noEmit
npm run build    # 生产构建
npm run preview  # 预览构建结果
```

> AI 图像增强依赖 Vercel serverless 函数 (`api/enhance.ts`)，本地开发需使用 `vercel dev` 替代 `npm run dev`。

---

## 环境变量

AI 图像增强功能需要配置 Pollinations API Key：

| 变量名 | 位置 | 说明 |
|--------|------|------|
| `POLLINATIONS_API_KEY` | Vercel 项目设置 → Environment Variables | 从 [enter.pollinations.ai](https://enter.pollinations.ai) 获取，仅服务端可见 |

配置后需重新部署（推送任意 commit 即可触发）才会生效。

---

## 许可证

MIT

---

[GitHub - qiao39gs/Pixel](https://github.com/qiao39gs/Pixel)
