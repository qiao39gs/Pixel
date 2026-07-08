# 像素拼豆图纸生成器

> Pixel Bead Pattern Generator — v1.0.4

纯浏览器端运行，上传图片 → 生成拼豆像素网格图纸。MARD 标准色卡匹配、CIEDE2000 色差体系、手动编辑、项目持久化、A4 分页 PDF 导出、AI 图像增强。

---

## 功能

- **图片上传裁切** — 1:1 / 4:3 / 3:4 / 16:9 / 9:16 / 自动比例裁切，拖拽旋转缩放
- **智能色卡匹配** — CIEDE2000 空间色差算法，最近邻像素映射到 MARD 221 色标准色卡
- **智能选色优化 (k-medoids)** — 可选开关，以量化误差最小为准则从色卡精选色号，替代默认频次选取；渐变/照片类图色彩还原更均衡，复用用户选定的色差算法
- **亮度/对比度/饱和度调节** — 松手后触发图像重处理，避免频繁渲染
- **AI 图像增强** — 通过 Pollinations 图生图 API 在源图进入拼豆管线前进行简化/降噪预处理；三档简化强度（轻度/中度/强烈）、扁平化颜色与卡通风格可选、自定义 prompt 追加
- **裁边修整** — 自动裁剪四边空白 + 四方向滑块手动精调边距
- **画布滚轮缩放** — 桌面端滚轮以鼠标位置为中心缩放画布，双指捏合移动端缩放
- **换色面板** — 已有色独立置顶分组、环形占比图、拖拽快速换色、系列快捷导航
- **格子级手动编辑** — 画笔、橡皮擦、魔棒批量选区（4 连通）、去杂色、撤销（Ctrl+Z）、重做（Ctrl+Shift+Z / Ctrl+Y）
- **项目保存/加载/画廊** — 独立右侧项目面板，缩略图列表展示，localStorage 持久化，支持重命名、删除、新建
- **JSON 导入/导出** — 项目文件可导出为 JSON 离线备份，支持导入恢复
- **移动端适配** — 四段式 tab 导航（参数/画布/色卡/项目）、工具栏折叠 "…" 菜单、长按取色、色卡长按拖拽换色、双指捏合缩放
- **高清 PNG 导出** — 含网格、标尺、色号标注、耗材清单
- **A4 分页 PDF 导出** — 大尺寸图纸自动切板分页

### 项目画廊

- **保存当前** — 将当前画布数据（像素色号 + 配置参数 + 原图）保存到 localStorage
- **更新当前** — 已加载项目时按钮文案变为"更新当前"，点击原地更新而非新建
- **加载** — 从列表恢复项目，含原图的版本支持调参重处理
- **新建项目** — 放弃当前工作回到图片上传页
- **JSON 导入/导出** — 离线备份与迁移
- **重命名** — 悬停项目条目出现铅笔图标，点击内联编辑

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
│   └── workspaceStore.ts               # Zustand 全局状态
├── hooks/
│   ├── useImageProcessing.ts           # 图像采样 & 色卡匹配管道
│   ├── useImageEnhancement.ts          # AI 图像增强
│   └── useCanvasRenderer.ts            # Canvas 离屏渲染
├── services/
│   └── pollinationsApi.ts              # Pollinations API 客户端封装 + prompt 构建
├── components/
│   ├── ImageUploader.tsx               # 图片上传 & 裁切
│   ├── PatternWorkspace.tsx            # 工作台主组件
│   └── workspace/
│       ├── ControlPanel.tsx             # 左侧控制面板
│       ├── CanvasViewport.tsx           # 画布视口 + 编辑交互
│       ├── StatsPanel.tsx               # 底部色卡用量统计
│       └── ProjectPanel.tsx             # 右侧项目管理面板
├── data/
│   └── palette.ts                       # MARD 221 色标准色卡
└── utils/
    ├── exportUtils.ts                   # PNG & PDF 导出
    ├── statsUtils.ts                    # 统计计算
    ├── editOperations.ts                # 编辑工具函数
    └── projectStorage.ts               # 项目 localStorage 持久化 & JSON 导入导出
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
