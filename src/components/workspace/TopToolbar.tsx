import React from 'react';
import { Menu, Pencil, Undo2, Redo2, Eraser, Sparkles, Wand2, Palette, Sliders, Layers, LayoutGrid, Award, RotateCcw, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface Props {
  currentPalette: Array<BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: any }>;
  onGeneratePng: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onReset: () => void;
}

const IconSize = 'w-4 h-4';

function TButton({ active, onClick, title, Icon, activeCls = 'bg-indigo-500 text-white' }: {
  active: boolean; onClick: () => void; title: string;
  Icon: React.ComponentType<{ className?: string }>; activeCls?: string;
}) {
  return (
    <button onClick={onClick} title={title} className={`p-2 rounded-lg transition-all cursor-pointer flex items-center ${active ? activeCls : 'text-slate-200 hover:bg-white/15'}`}>
      <Icon className={IconSize} />
    </button>
  );
}

const Sep = () => <span className="w-px h-5 bg-white/10 mx-1" />;

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
  const toggleProjectPanel = useWorkspaceStore(s => s.toggleProjectPanel);
  const toggleLeftDrawer = useWorkspaceStore(s => s.toggleLeftDrawer);
  const toggleRightPanel = useWorkspaceStore(s => s.toggleRightPanel);
  const panelOpen = useWorkspaceStore(s => s.panelOpen);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);
  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const stats = useWorkspaceStore(s => s.stats);
  const showRulers = useWorkspaceStore(s => s.showRulers);
  const showNumbers = useWorkspaceStore(s => s.showNumbers);

  const [exportOpen, setExportOpen] = useState(false);
  const leftOpen = panelOpen === 'left' || panelOpen === 'both';
  const rightOpen = panelOpen === 'right' || panelOpen === 'both';

  const toggleEdit = () => { setEditMode(!editMode); setBrushBead(null); setSelectedCell(null); setIsEraser(false); setWandMode(false); setWandSelection(new Set()); };
  const fire = (fn: () => void) => () => { fn(); setExportOpen(false); };

  return (
    <>
      {/* 顶部居中工具栏 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center px-1.5 py-1.5 glass-toolbar rounded-2xl animate-toolbar-pop max-w-[calc(100vw-1.5rem)]">
        {/* 菜单分组 */}
        <TButton active={false} onClick={toggleProjectPanel} title="项目" Icon={Menu} activeCls="" />
        <Sep />

        {/* 编辑分组 */}
        <TButton active={editMode} onClick={toggleEdit} title="编辑模式 (V)" Icon={Pencil} />
        <TButton active={false} onClick={undo} title="撤销 (Ctrl+Z)" Icon={Undo2} />
        <TButton active={false} onClick={redo} title="重做 (Ctrl+Shift+Z)" Icon={Redo2} />

        {/* 编辑工具（sm+ 显示） */}
        <div className="hidden sm:flex items-center">
          {editMode && <>
            <Sep />
            <TButton active={isEraser} onClick={() => { setIsEraser(!isEraser); setBrushBead(null); }} title="橡皮擦 (E)" Icon={Eraser} activeCls="bg-red-500 text-white" />
            <TButton active={false} onClick={() => denoise(gridWidth, gridHeight, currentPalette)} title="去杂色" Icon={Sparkles} />
            <TButton active={wandMode} onClick={() => { setWandMode(!wandMode); setWandSelection(new Set()); }} title="魔棒 (W)" Icon={Wand2} activeCls="bg-cyan-500 text-white" />
            <TButton active={showPalettePanel} onClick={() => setShowPalettePanel(!showPalettePanel)} title="色板 (B)" Icon={Palette} activeCls="bg-violet-500 text-white" />
          </>}
        </div>

        {/* 面板切换 */}
        <span className="hidden sm:block"><Sep /></span>
        <div className="flex items-center">
          <TButton active={leftOpen} onClick={toggleLeftDrawer} title="参数面板" Icon={Sliders} activeCls={leftOpen ? 'bg-white/20 text-white' : ''} />
          <TButton active={rightOpen} onClick={toggleRightPanel} title="色卡面板" Icon={Layers} activeCls={rightOpen ? 'bg-white/20 text-white' : ''} />
        </div>

        {/* 导出 */}
        <Sep />
        <div className="relative">
          <button onClick={() => setExportOpen(o => !o)} title="导出" className="px-2.5 py-2 rounded-lg text-slate-200 hover:bg-white/15 cursor-pointer flex items-center gap-1 text-[13px] font-bold transition-colors">
            导出 <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-50 glass-toolbar rounded-xl py-1.5 min-w-[200px] animate-panel-pop overflow-hidden">
                <button onClick={fire(() => onGeneratePng(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers }))} className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-100 hover:bg-white/10 cursor-pointer flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-indigo-400" />导出图片 (PNG)</button>
                <button onClick={fire(() => onGeneratePdf(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers }))} className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-100 hover:bg-white/10 cursor-pointer flex items-center gap-2"><Award className="w-4 h-4 text-violet-400" />导出 PDF</button>
                <div className="my-1 mx-2 h-px bg-white/10" />
                <button onClick={() => { onReset(); setExportOpen(false); }} className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-100 hover:bg-white/10 cursor-pointer flex items-center gap-2"><RotateCcw className="w-4 h-4 text-amber-400" />重选图片</button>
              </div>
            </>
          )}
        </div>

        {/* 画笔指示 */}
        {editMode && brushBead && (
          <div className="hidden sm:flex items-center gap-1.5 ml-1 pl-2 pr-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg">
            <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: brushBead.hex }} />
            <span className="text-[11px] font-bold text-amber-400">{brushBead.code}</span>
          </div>
        )}
      </div>
    </>
  );
}