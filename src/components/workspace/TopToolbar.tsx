import React from 'react';
import { FolderKanban, Pencil, Undo2, Redo2, Eraser, Sparkles, Wand2, Palette, Sliders, Layers, LayoutGrid, Award, Copy, RotateCcw, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { confirmDiscardChanges } from '../../hooks/useProjectSafety';
import { COLOR_GROUPS } from '../../data/palette';

interface Props {
  currentPalette: Array<BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: any }>;
  onGeneratePng: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onReset: () => void;
}

const IconSize = 'w-4 h-4';

function TButton({ active, onClick, title, Icon, activeCls = 'bg-[#E8570A] text-white', disabled = false }: {
  active: boolean; onClick: () => void; title: string;
  Icon: React.ComponentType<{ className?: string }>; activeCls?: string; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} aria-label={title} disabled={disabled} className={`editor-tool-button ${active ? activeCls : 'text-stone-200 hover:bg-white/10'} ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
      <Icon className={IconSize} />
    </button>
  );
}

const Sep = () => <span className="w-px h-5 bg-white/10 mx-1 shrink-0" />;

function PanelButton({ active, onClick, title, label, Icon }: {
  active: boolean;
  onClick: () => void;
  title: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button onClick={onClick} title={title} aria-label={title} aria-pressed={active} className="editor-panel-button cursor-pointer">
      <Icon className={IconSize} />
      <span>{label}</span>
    </button>
  );
}

export default function TopToolbar({ currentPalette, onGeneratePng, onGeneratePdf, onReset }: Props) {
  const editMode = useWorkspaceStore(s => s.editMode);
  const setEditMode = useWorkspaceStore(s => s.setEditMode);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const setSelectedCell = useWorkspaceStore(s => s.setSelectedCell);
  const setIsEraser = useWorkspaceStore(s => s.setIsEraser);
  const setWandMode = useWorkspaceStore(s => s.setWandMode);
  const setWandSelection = useWorkspaceStore(s => s.setWandSelection);
  const isEraser = useWorkspaceStore(s => s.isEraser);
  const brushBead = useWorkspaceStore(s => s.brushBead);
  const wandMode = useWorkspaceStore(s => s.wandMode);
  const undo = useWorkspaceStore(s => s.undo);
  const redo = useWorkspaceStore(s => s.redo);
  const denoise = useWorkspaceStore(s => s.denoise);
  const showPalettePanel = useWorkspaceStore(s => s.showPalettePanel);
  const setShowPalettePanel = useWorkspaceStore(s => s.setShowPalettePanel);
  const projectPanelOpen = useWorkspaceStore(s => s.projectPanelOpen);
  const setProjectPanelOpen = useWorkspaceStore(s => s.setProjectPanelOpen);
  const toggleLeftDrawer = useWorkspaceStore(s => s.toggleLeftDrawer);
  const toggleRightPanel = useWorkspaceStore(s => s.toggleRightPanel);
  const setPanelOpen = useWorkspaceStore(s => s.setPanelOpen);
  const panelOpen = useWorkspaceStore(s => s.panelOpen);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);
  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const stats = useWorkspaceStore(s => s.stats);
  const showRulers = useWorkspaceStore(s => s.showRulers);
  const showNumbers = useWorkspaceStore(s => s.showNumbers);
  const undoStack = useWorkspaceStore(s => s.undoStack);
  const redoStack = useWorkspaceStore(s => s.redoStack);
  const pushToast = useWorkspaceStore(s => s.pushToast);

  const [exportOpen, setExportOpen] = useState(false);
  const leftOpen = panelOpen === 'left' || panelOpen === 'both';
  const rightOpen = panelOpen === 'right' || panelOpen === 'both';

  const toggleEdit = () => { setEditMode(!editMode); setBrushBead(null); setSelectedCell(null); setIsEraser(false); setWandMode(false); setWandSelection(new Set()); };
  const fire = (fn: () => void) => () => { fn(); setExportOpen(false); };
  const copyMaterialUsage = async () => {
    if (stats.length === 0) {
      pushToast('暂无耗材用量可复制');
      return;
    }

    const groups = new Map<string, IngredientStat[]>();
    stats.forEach(stat => {
      const group = groups.get(stat.bead.series) ?? [];
      group.push(stat);
      groups.set(stat.bead.series, group);
    });
    const seriesOrder = new Map(COLOR_GROUPS.map((group, index) => [group.series, index]));
    const text = [...groups.entries()]
      .sort(([a], [b]) => (seriesOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (seriesOrder.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b, 'zh-CN'))
      .map(([series, items]) => [
        series,
        ...items
          .sort((a, b) => a.bead.code.localeCompare(b.bead.code, undefined, { numeric: true }))
          .map(item => `${item.bead.code} ${item.bead.name} ${item.count}颗`),
      ].join('\n'))
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      pushToast('耗材用量已复制');
      setExportOpen(false);
    } catch {
      pushToast('复制失败，请检查剪贴板权限');
    }
  };
  const toggleProjects = () => {
    setPanelOpen('none');
    setShowPalettePanel(false);
    setProjectPanelOpen(!projectPanelOpen);
  };
  const toggleLeftPanel = () => {
    setProjectPanelOpen(false);
    setShowPalettePanel(false);
    if (window.matchMedia('(max-width: 1023px)').matches) setPanelOpen(leftOpen ? 'none' : 'left');
    else toggleLeftDrawer();
  };
  const toggleStatsPanel = () => {
    setProjectPanelOpen(false);
    setShowPalettePanel(false);
    if (window.matchMedia('(max-width: 1023px)').matches) setPanelOpen(rightOpen ? 'none' : 'right');
    else toggleRightPanel();
  };
  const toggleBrushPalette = () => {
    setProjectPanelOpen(false);
    setPanelOpen('none');
    setShowPalettePanel(!showPalettePanel);
  };
  const resetImage = () => {
    if (!confirmDiscardChanges('当前项目有未保存的修改。重选图片将放弃这些修改，是否继续？')) return;
    useWorkspaceStore.getState().clearCurrentProject();
    onReset();
    setExportOpen(false);
  };

  return (
    <>
      {/* 顶部居中工具栏 */}
      <nav aria-label="编辑器工具栏" className="editor-top-toolbar glass-toolbar animate-toolbar-pop">
        {/* 弹出面板入口 */}
        <div className="flex items-center">
          <PanelButton active={projectPanelOpen} onClick={toggleProjects} title="项目管理：保存、打开和备份图纸" label="项目" Icon={FolderKanban} />
          <PanelButton active={leftOpen} onClick={toggleLeftPanel} title="图纸参数：规格、颜色、裁剪和视图" label="参数" Icon={Sliders} />
          <PanelButton active={rightOpen} onClick={toggleStatsPanel} title="耗材统计：查看色号和拼豆用量" label="耗材" Icon={Layers} />
        </div>
        <Sep />

        {/* 编辑分组 */}
        <TButton active={editMode} onClick={toggleEdit} title="编辑模式 (V)" Icon={Pencil} />
        <span className="max-sm:hidden contents">
          <TButton active={false} onClick={undo} title="撤销 (Ctrl+Z)" Icon={Undo2} disabled={undoStack.length === 0} />
          <TButton active={false} onClick={redo} title="重做 (Ctrl+Shift+Z)" Icon={Redo2} disabled={redoStack.length === 0} />
        </span>

        {/* 编辑工具（sm+ 显示） */}
        <div className="hidden sm:flex items-center">
          {editMode && <>
            <Sep />
            <TButton active={isEraser} onClick={() => { setIsEraser(!isEraser); setBrushBead(null); }} title="橡皮擦 (E)" Icon={Eraser} activeCls="bg-red-500 text-white" />
            <TButton active={false} onClick={() => denoise(gridWidth, gridHeight, currentPalette)} title="去杂色" Icon={Sparkles} />
            <TButton active={wandMode} onClick={() => { setWandMode(!wandMode); setWandSelection(new Set()); }} title="魔棒 (W)" Icon={Wand2} activeCls="bg-cyan-500 text-white" />
            <TButton active={showPalettePanel} onClick={toggleBrushPalette} title="画笔色板：选择绘制颜色 (B)" Icon={Palette} activeCls="bg-[#E8570A] text-white" />
          </>}
        </div>

        <span className="hidden sm:block"><Sep /></span>
        <TButton active={false} onClick={resetImage} title="返回首页并选择其他图片" Icon={RotateCcw} />

        {/* 导出 */}
        <Sep />
        <div className="relative">
          <button onClick={() => setExportOpen(o => !o)} title="导出" aria-expanded={exportOpen} className="h-9 px-2.5 rounded-lg text-stone-100 hover:bg-white/10 cursor-pointer flex items-center gap-1 text-[13px] font-bold transition-colors whitespace-nowrap">
            导出 <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-50 glass-toolbar rounded-xl py-1.5 min-w-[200px] animate-panel-pop overflow-hidden">
                <button onClick={fire(() => onGeneratePng(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers }))} className="w-full px-3 py-2 text-left text-[13px] font-bold text-stone-100 hover:bg-white/10 cursor-pointer flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-orange-400" />导出图片 (PNG)</button>
                <button onClick={fire(() => onGeneratePdf(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers }))} className="w-full px-3 py-2 text-left text-[13px] font-bold text-stone-100 hover:bg-white/10 cursor-pointer flex items-center gap-2"><Award className="w-4 h-4 text-orange-300" />导出 PDF</button>
                <button onClick={copyMaterialUsage} className="w-full px-3 py-2 text-left text-[13px] font-bold text-stone-100 hover:bg-white/10 cursor-pointer flex items-center gap-2"><Copy className="w-4 h-4 text-orange-200" />复制耗材用量</button>
              </div>
            </>
          )}
        </div>

        {/* 画笔指示 */}
        {editMode && brushBead && (
          <div className="hidden sm:flex items-center gap-1.5 ml-1 pl-2 pr-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg">
            <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: brushBead.hex }} />
            <span className="text-[11px] font-bold text-orange-300">{brushBead.code}</span>
          </div>
        )}
      </nav>
    </>
  );
}
