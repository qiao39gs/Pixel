# 像素拼豆图纸生成器

纯浏览器端运行，一键将图片转换为拼豆像素网格图纸。支持 MARD 标准色卡匹配、CIEDE2000 色差体系、A4 分页 PDF 导出。

---

## ✨ 功能

- **智能色卡匹配** — 基于 CIEDE2000 空间色差算法，将图片像素精确映射到 MARD 221 色标准色卡
- **多比例裁切** — 支持 1:1 / 4:3 / 3:4 / 16:9 / 9:16 / 原图比例自动裁切选区
- **预设画布规格** — 52×52 / 78×78 / 104×104 三档预设 + 自定义宽高
- **手动去杂色** — 编辑模式支持逐格替换颜色、右键取色、滑动批量填充、橡皮擦、自定义取色器
- **耗材清单** — 自动按系列统计每种色号的用量，折算 1K 标准包装袋数
- **A4 分页 PDF** — 大尺寸图纸自动切板分页，附带完整网格标注
- **高清 PNG 导出** — 含耗材清单的高分辨率图纸输出
- **100% 本地计算** — 所有图片处理在浏览器中完成，不上传服务器

## 🔧 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS v4 |
| 图标 | Lucide React |
| 色彩算法 | CIEDE2000（HEX → RGB → XYZ → Lab → ΔE2000） |
| 导出 | jsPDF + Canvas API |
| 字体 | Inter / Outfit / JetBrains Mono |

## 📁 项目结构

```
src/
├── App.tsx                        # 主组件，路由状态管理
├── main.tsx                       # React 入口
├── index.css                      # Tailwind + 自定义样式
├── types.ts                       # BeadPaletteItem / TransformedPixel / IngredientStat
├── colorUtils.ts                  # 色彩空间转换 & CIEDE2000 色差计算
├── components/
│   ├── ImageUploader.tsx          # 图片上传 & 裁切视口
│   └── PatternWorkspace.tsx       # 图纸生成 & 手动编辑工作台
├── data/
│   └── palette.ts                 # MARD 221 色标准色卡（A~M 系列）
└── utils/
    └── exportUtils.ts             # PNG & PDF 导出
```

## 🚀 开发

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000）
npm run dev

# 类型检查
npm run lint

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 📦 MARD 色卡系列

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

## 📄 许可证

MIT
