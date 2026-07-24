import React from 'react';
import { Menu, Pencil, Undo2, Redo2, Eraser, Sparkles, Wand2, Palette, Sliders, Layers } from 'lucide-react';
import { BeadPaletteItem } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import ExportMenu from './ExportMenu';

interface Props {
  currentPalette: Array<BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: any }>;
  onGeneratePng: (pixels: any[], w: number, h: number, stats: any[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: any[], w: number, h: number, stats: any[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onReset: () => void;
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
  const toggleProjectPanel = useWorkspaceStore(s => s.toggleProjectPanel);
  const toggleLeftDrawer = useWorkspaceStore(s => s.toggleLeftDrawer);
  const toggleRightPanel = useWorkspaceStore(s => s.toggleRightPanel);
  const panelOpen = useWorkspaceStore(s => s.panelOpen);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);

  const leftOpen = panelOpen === 'left' || panelOpen === 'both';
  const rightOpen = panelOpen === 'right' || panelOpen === 'both';

  const toggleEdit = () => {
    setEditMode(!editMode);
    setBrushBead(null);
    setSelectedCell(null);
    setIsEraser(false);
    setWandMode(false);
    setWandSelection(new Set());
  };

  const toolBtn = (active: boolean, onClick: () => void, title: string, Icon: React.ComponentType<{ className?: string }>, activeCls = 'bg-indigo-500 text-white') => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${active ? activeCls : 'text-slate-200 hover:bg-white/15'}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 glass-toolbar rounded-2xl animate-toolbar-pop max-w-[calc(100vw-1.5rem)]">
      {/* 左侧：菜单 + 编辑 */}
      <div className="flex items-center gap-0.5">
        {toolBtn(false, toggleProjectPanel, '项目', Menu, '')}
        <span className="w-px h-5 bg-white/10 mx-0.5" />
        {toolBtn(editMode, toggleEdit, '编辑模式 (V)', Pencil, 'bg-indigo-500 text-white')}
        <span className="w-px h-5 bg-white/10 mx-0.5" />
        {toolBtn(false, undo, '撤销 (Ctrl+Z)', Undo2, '')}
        {toolBtn(false, redo, '重做 (Ctrl+Shift+Z)', Redo2, '')}
      </div>

      {/* 中间：编辑工具（sm+ 显示） */}
      <div className="hidden sm:flex items-center gap-0.5">
        <span className="w-px h-5 bg-white/10 mx-0.5" />
        {editMode && toolBtn(isEraser, () => { setIsEraser(!isEraser); setBrushBead(null); }, '橡皮擦 (E)', Eraser, 'bg-red-500 text-white')}
        {editMode && toolBtn(false, () => denoise(gridWidth, gridHeight, currentPalette), '去杂色', Sparkles, '')}
        {editMode && toolBtn(wandMode, () => { setWandMode(!wandMode); setWandSelection(new Set()); }, '魔棒 (W)', Wand2, 'bg-cyan-500 text-white')}
        {editMode && toolBtn(showPalettePanel, () => setShowPalettePanel(!showPalettePanel), '色板 (B)', Palette, 'bg-violet-500 text-white')}
      </div>

      {/* 右侧：面板切换 + 导出 */}
      <span className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" />
      <div className="flex items-center gap-0.5">
        {toolBtn(leftOpen, toggleLeftDrawer, '参数面板', Sliders, leftOpen ? 'bg-white/20 text-white' : '')}
        {toolBtn(rightOpen, toggleRightPanel, '色卡面板', Layers, rightOpen ? 'bg-white/20 text-white' : '')}
        <span className="w-px h-5 bg-white/10 mx-0.5" />
        <ExportMenu onGeneratePng={onGeneratePng} onGeneratePdf={onGeneratePdf} onReset={onReset} />
      </div>

      {/* 画笔指示 */}
      {editMode && brushBead && (
        <div className="hidden sm:flex items-center gap-1.5 ml-1 pl-2 pr-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg">
          <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: brushBead.hex }} />
          <span className="text-[11px] font-bold text-amber-400">{brushBead.code}</span>
        </div>
      )}
    </div>
  );
}