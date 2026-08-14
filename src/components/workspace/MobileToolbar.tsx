import React from 'react';
import { Undo2, Redo2, Move, Eraser, Sparkles, Wand2, Palette, PenTool, Brush } from 'lucide-react';
import { PaletteItemWithCache } from '../../utils/quantizeImage';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface Props {
  currentPalette: PaletteItemWithCache[];
}

export default function MobileToolbar({ currentPalette }: Props) {
  const editMode = useWorkspaceStore(s => s.editMode);
  const undo = useWorkspaceStore(s => s.undo);
  const redo = useWorkspaceStore(s => s.redo);
  const dragMode = useWorkspaceStore(s => s.dragMode);
  const setDragMode = useWorkspaceStore(s => s.setDragMode);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const setIsEraser = useWorkspaceStore(s => s.setIsEraser);
  const setWandMode = useWorkspaceStore(s => s.setWandMode);
  const setWandSelection = useWorkspaceStore(s => s.setWandSelection);
  const isEraser = useWorkspaceStore(s => s.isEraser);
  const wandMode = useWorkspaceStore(s => s.wandMode);
  const showPalettePanel = useWorkspaceStore(s => s.showPalettePanel);
  const setShowPalettePanel = useWorkspaceStore(s => s.setShowPalettePanel);
  const strokePanelOpen = useWorkspaceStore(s => s.strokePanelOpen);
  const setStrokePanelOpen = useWorkspaceStore(s => s.setStrokePanelOpen);
  const brushPanelOpen = useWorkspaceStore(s => s.brushPanelOpen);
  const setBrushPanelOpen = useWorkspaceStore(s => s.setBrushPanelOpen);
  const denoise = useWorkspaceStore(s => s.denoise);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);
  const undoStack = useWorkspaceStore(s => s.undoStack);
  const redoStack = useWorkspaceStore(s => s.redoStack);
  const panelOpen = useWorkspaceStore(s => s.panelOpen);

  if (!editMode || panelOpen !== 'none') return null;

  const toggleDragMode = () => {
    if (!dragMode) { setBrushBead(null); setIsEraser(false); setWandMode(false); setWandSelection(new Set()); setStrokePanelOpen(false); setBrushPanelOpen(false); setShowPalettePanel(false); setDragMode(true); }
    else { setDragMode(false); }
  };

  const toolBtn = (active: boolean, onClick: () => void, title: string, Icon: React.ComponentType<{ className?: string }>, label: string, activeCls = 'bg-[#E8570A] text-white', disabled = false) => (
    <button onClick={onClick} title={title} aria-label={title} disabled={disabled} className={`flex flex-col items-center justify-center gap-0.5 min-w-12 h-11 px-2 rounded-xl transition-all ${active ? activeCls : 'text-stone-200 hover:bg-white/10'} ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-bold leading-none">{label}</span>
    </button>
  );

  return (
    <div className="sm:hidden absolute bottom-[max(6px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 px-1.5 py-1.5 glass-toolbar rounded-2xl animate-toolbar-pop max-w-[calc(100vw-12px)] overflow-x-auto scrollbar-dark">
      {toolBtn(false, undo, '撤销', Undo2, '撤销', '', undoStack.length === 0)}
      {toolBtn(false, redo, '重做', Redo2, '重做', '', redoStack.length === 0)}
      <span className="w-px h-5 bg-white/10 mx-0.5" />
      {toolBtn(dragMode, toggleDragMode, '拖拽模式', Move, '拖拽', 'bg-amber-500 text-white')}
      {toolBtn(isEraser, () => { setIsEraser(!isEraser); setBrushBead(null); setDragMode(false); }, '橡皮擦', Eraser, '橡皮', 'bg-red-500 text-white')}
      {toolBtn(false, () => denoise(gridWidth, gridHeight, currentPalette), '去杂色', Sparkles, '去杂', '')}
      {toolBtn(wandMode, () => { setWandMode(!wandMode); setWandSelection(new Set()); setDragMode(false); }, '魔棒', Wand2, '魔棒', 'bg-cyan-500 text-white')}
      {toolBtn(showPalettePanel, () => { setShowPalettePanel(!showPalettePanel); setStrokePanelOpen(false); setBrushPanelOpen(false); setDragMode(false); }, '色板', Palette, '色板', 'bg-violet-500 text-white')}
      {toolBtn(strokePanelOpen, () => { setStrokePanelOpen(!strokePanelOpen); setShowPalettePanel(false); setBrushPanelOpen(false); setDragMode(false); }, '描边', PenTool, '描边', 'bg-violet-500 text-white')}
      {toolBtn(brushPanelOpen, () => { setBrushPanelOpen(!brushPanelOpen); setShowPalettePanel(false); setStrokePanelOpen(false); setDragMode(false); }, '画笔粗细', Brush, '粗细', 'bg-emerald-500 text-white')}
    </div>
  );
}
