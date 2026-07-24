import React from 'react';
import { Undo2, Redo2, Move, Eraser, Sparkles, Wand2, Palette } from 'lucide-react';
import { BeadPaletteItem } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface Props {
  currentPalette: Array<BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: any }>;
}

export default function MobileToolbar({ currentPalette }: Props) {
  const editMode = useWorkspaceStore(s => s.editMode);
  const undo = useWorkspaceStore(s => s.undo);
  const redo = useWorkspaceStore(s => s.redo);
  const dragMode = useWorkspaceStore(s => s.dragMode);
  const setDragMode = useWorkspaceStore(s => s.setDragMode);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const setSelectedCell = useWorkspaceStore(s => s.setSelectedCell);
  const setIsEraser = useWorkspaceStore(s => s.setIsEraser);
  const setWandMode = useWorkspaceStore(s => s.setWandMode);
  const setWandSelection = useWorkspaceStore(s => s.setWandSelection);
  const isEraser = useWorkspaceStore(s => s.isEraser);
  const wandMode = useWorkspaceStore(s => s.wandMode);
  const showPalettePanel = useWorkspaceStore(s => s.showPalettePanel);
  const setShowPalettePanel = useWorkspaceStore(s => s.setShowPalettePanel);
  const denoise = useWorkspaceStore(s => s.denoise);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);

  if (!editMode) return null;

  const toggleDragMode = () => {
    if (!dragMode) { setBrushBead(null); setIsEraser(false); setWandMode(false); setWandSelection(new Set()); setDragMode(true); }
    else { setDragMode(false); }
  };

  const toolBtn = (active: boolean, onClick: () => void, title: string, Icon: React.ComponentType<{ className?: string }>, label: string, activeCls = 'bg-indigo-500 text-white') => (
    <button onClick={onClick} title={title} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all cursor-pointer ${active ? activeCls : 'text-slate-200 hover:bg-white/15'}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs font-bold">{label}</span>
    </button>
  );

  return (
    <div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 px-2 py-1.5 glass-toolbar rounded-2xl animate-toolbar-pop max-w-[calc(100vw-1.5rem)] overflow-x-auto scrollbar-dark">
      {toolBtn(false, undo, '撤销', Undo2, '撤销', '')}
      {toolBtn(false, redo, '重做', Redo2, '重做', '')}
      <span className="w-px h-5 bg-white/10 mx-0.5" />
      {toolBtn(dragMode, toggleDragMode, '拖拽模式', Move, '拖拽', 'bg-amber-500 text-white')}
      {toolBtn(isEraser, () => { setIsEraser(!isEraser); setBrushBead(null); setDragMode(false); }, '橡皮擦', Eraser, '橡皮', 'bg-red-500 text-white')}
      {toolBtn(false, () => denoise(gridWidth, gridHeight, currentPalette), '去杂色', Sparkles, '去杂', '')}
      {toolBtn(wandMode, () => { setWandMode(!wandMode); setWandSelection(new Set()); setDragMode(false); }, '魔棒', Wand2, '魔棒', 'bg-cyan-500 text-white')}
      {toolBtn(showPalettePanel, () => { setShowPalettePanel(!showPalettePanel); setDragMode(false); }, '色板', Palette, '色板', 'bg-violet-500 text-white')}
    </div>
  );
}