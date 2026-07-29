# 像素拼豆图纸生成器

[![Version](https://img.shields.io/badge/version-1.0.5-E8570A?logo=semver&logoColor=white)](https://github.com/qiao39gs/Pixel)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript 5.8](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite 6](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![友链 LINUX DO](https://img.shields.io/badge/LINUX--DO-Community-blue.svg)](https://linux.do/)

将图片转换为可直接制作的拼豆像素图纸。项目支持 MARD 221 色标准色卡匹配、格子级编辑、耗材统计、项目持久化以及 PNG、PDF 导出。

## 功能特性

### 图像处理

- 上传、拖拽或粘贴 JPEG、PNG 图片。
- 支持原图、`1:1`、`4:3`、`3:4`、`16:9`、`9:16` 比例裁剪。
- 支持平移、缩放、旋转、翻转、亮度、对比度和饱和度调整。
- 提供 CIEDE2000、CIE94、CIE76、Weighted RGB 四种颜色匹配算法。
- 支持限色、k-medoids 选色优化、背景移除和 AI 图像增强。

### 图纸编辑

- 画笔、橡皮擦、魔棒选区、去杂色和批量换色。
- 支持撤销、重做、自动裁边和手动边距调整。
- 色卡面板展示颜色占比、相似度和实时耗材数量。
- 桌面端和移动端均支持画布平移、缩放及快捷编辑。

### 项目与导出

- 使用 IndexedDB 保存项目，支持重命名、删除、JSON 导入与导出。
- 自动保存用于恢复的本地草稿，并保护未保存的手工编辑。
- 导出高清 PNG 和 A4 多页 PDF 图纸。
- 将按系列分组的耗材用量复制为纯文本。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript 5.8、Vite 6 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand 5 |
| 图标 | Lucide React |
| 图像与导出 | Canvas API、jsPDF |
| 数据持久化 | IndexedDB |
| AI 增强 | Pollinations img2img API、Vercel Functions |

## 快速开始

### 环境要求

- Node.js 20.19+ 或 22.12+
- npm

### 安装与运行

```bash
npm install
npm run dev
```

开发服务器默认运行在 <http://localhost:3000>。

常用命令：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器，不包含本地 AI 代理 |
| `npm run lint` | 执行 TypeScript 类型检查（`tsc --noEmit`） |
| `npm run build` | 生成生产构建 |
| `npm run preview` | 在 3000 端口预览生产构建 |

项目目前没有自动化测试框架，也没有 ESLint 或 Prettier。`npm run lint` 仅执行类型检查，`npm run build` 不能替代该检查。

## AI 增强配置

AI 图像增强通过 `api/enhance.ts` 调用 Pollinations API。API Key 只在服务端读取，不会暴露给浏览器。

1. 从 [Pollinations](https://enter.pollinations.ai) 获取 API Key。
2. 在 Vercel 项目的 Environment Variables 中添加 `POLLINATIONS_API_KEY`。
3. 重新部署项目。

AI 功能默认开启。若不需要该功能，在 Vercel 项目的 Environment Variables 中将 `VITE_ENABLE_AI` 设置为精确字符串 `false`，图纸参数面板将不再显示 AI 标签页；修改后需要重新部署。

本地调试 AI 增强时，需要先安装并登录 [Vercel CLI](https://vercel.com/docs/cli)，关联项目，并通过 Vercel CLI 拉取开发环境变量或参考 `.env.example` 配置本地服务端环境，然后运行：

```bash
vercel dev
```

也可以使用 `npx vercel dev`。仅运行 `npm run dev` 时，其他前端功能可以正常使用，但 AI 增强不可用。不要给 API Key 添加 `VITE_` 前缀，否则可能被打包到客户端。

## 使用流程

1. 上传图片并调整裁剪范围。
2. 进入工作台，设置图纸尺寸、色彩参数和匹配算法。
3. 使用画笔、橡皮擦、魔棒或换色面板修整图纸。
4. 保存项目，或导出 PNG、PDF 和耗材用量。

项目和自动恢复草稿只保存在当前浏览器的 IndexedDB 中，不会同步到其他设备。清理站点数据可能导致内容丢失，建议定期导出 JSON 备份。

常用快捷键：

| 快捷键 | 操作 |
| --- | --- |
| `Ctrl/Cmd + S` | 保存或更新当前项目；未命名项目会打开项目面板 |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z`、`Ctrl/Cmd + Y` | 重做 |
| `V` | 切换编辑模式 |
| `B` | 在编辑模式中打开或关闭色板 |
| `E` | 在编辑模式中切换橡皮擦 |
| `W` | 在编辑模式中切换魔棒 |
| `Space` | 按住临时平移画布 |
| `Escape` | 退出编辑模式 |

## 项目结构

```text
.
├── api/
│   └── enhance.ts                 # Pollinations API 服务端代理
├── src/
│   ├── components/                # 上传页、工作台和界面组件
│   ├── data/palette.ts            # MARD 221 色标准色卡
│   ├── hooks/                     # 图像处理、渲染、AI 与项目安全 hooks
│   ├── services/                  # 外部 API 客户端
│   ├── store/workspaceStore.ts    # Zustand 全局状态
│   ├── utils/                     # 量化、编辑、交互、存储和导出模块
│   ├── App.tsx                    # 根组件、页面切换与导出入口
│   ├── main.tsx                   # ReactDOM 挂载入口
│   ├── index.css                  # Tailwind 主题和全局样式
│   └── types.ts                   # 共享类型
├── AGENTS.md                      # 开发代理指南
├── package.json
└── vite.config.ts
```

更详细的架构约束和开发约定请参阅 [`AGENTS.md`](./AGENTS.md)。

推荐使用最新版 Chrome、Edge、Firefox 或 Safari。复制耗材用量需要浏览器允许页面写入剪贴板。

## 链接

- [GitHub 仓库](https://github.com/qiao39gs/Pixel)
- [LINUX DO 社区](https://linux.do/)
