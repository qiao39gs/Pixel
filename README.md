# 像素拼豆图纸生成器

> Pixel Bead Pattern Generator — v1.0.1

纯浏览器端运行，上传图片 → 生成拼豆像素网格图纸。MARD 标准色卡匹配、CIEDE2000 色差体系、手动编辑、A4 分页 PDF 导出。

---

## 功能

- **图片上传裁切** — 1:1 / 4:3 / 3:4 / 16:9 / 9:16 / 自动比例裁切，拖拽旋转缩放
- **智能色卡匹配** — CIEDE2000 空间色差算法，最近邻像素映射到 MARD 221 色标准色卡
- **亮度/对比度/饱和度调节** — 松手后触发图像重处理，避免频繁渲染
- **裁边修整** — 自动裁剪四边空白 + 四方向滑块手动精调边距
- **换色面板** — 已有色独立置顶分组、环形占比图、拖拽快速换色、系列快捷导航
- **格子级手动编辑** — 画笔、橡皮擦、魔棒批量选区、去杂色、撤销（Ctrl+Z）
- **移动端适配** — 三段式 tab 导航、工具栏折叠 "…" 菜单、长按取色、双指捏合缩放
- **高清 PNG 导出** — 含网格、标尺、色号标注、耗材清单
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
| 导出 | jsPDF + Canvas API |
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
├── store/
│   └── workspaceStore.ts               # Zustand 全局状态
├── hooks/
│   ├── useImageProcessing.ts           # 图像采样 & 色卡匹配管道
│   └── useCanvasRenderer.ts            # Canvas 离屏渲染
├── components/
│   ├── ImageUploader.tsx               # 图片上传 & 裁切
│   ├── PatternWorkspace.tsx            # 工作台主组件
│   └── workspace/
│       ├── ControlPanel.tsx             # 左侧控制面板
│       ├── CanvasViewport.tsx           # 画布视口 + 编辑交互
│       └── StatsPanel.tsx               # 底部色卡用量统计
├── data/
│   └── palette.ts                       # MARD 221 色标准色卡
└── utils/
    ├── exportUtils.ts                   # PNG & PDF 导出
    ├── statsUtils.ts                    # 统计计算
    └── editOperations.ts                # 编辑工具函数
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
npm run dev      # http://localhost:3000
npm run lint     # tsc --noEmit
npm run build    # 生产构建
npm run preview  # 预览构建结果
```

---

## 许可证

MIT

---

[GitHub - qiao39gs/Pixel](https://github.com/qiao39gs/Pixel)
