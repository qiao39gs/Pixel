import React from 'react';
import { Brush, Eraser, MousePointer2, Move, Palette, Wand2 } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

export default function ToolHint() {
  const editMode = useWorkspaceStore(s => s.editMode);
  const dragMode = useWorkspaceStore(s => s.dragMode);
  const brushBead = useWorkspaceStore(s => s.brushBead);
  const isEraser = useWorkspaceStore(s => s.isEraser);
  const wandMode = useWorkspaceStore(s => s.wandMode);
  const showPalettePanel = useWorkspaceStore(s => s.showPalettePanel);
  const panelOpen = useWorkspaceStore(s => s.panelOpen);

  if (panelOpen !== 'none' && window.matchMedia('(max-width: 1023px)').matches) return null;

  let Icon = MousePointer2;
  let label = '查看';
  let desktop = '拖动画布 · 滚轮缩放';
  let mobile = '单指拖动画布 · 双指缩放';

  if (showPalettePanel && editMode) {
    Icon = Palette;
    label = '色板';
    desktop = '单击色块选择画笔颜色';
    mobile = '点按色块选择画笔颜色';
  } else if (dragMode) {
    Icon = Move;
    label = '拖拽';
    desktop = '按住左键拖动画布 · 松开 Space 返回';
    mobile = '单指拖动画布 · 双指缩放';
  } else if (editMode && wandMode) {
    Icon = Wand2;
    label = '魔棒';
    desktop = brushBead || isEraser ? '左键填充连续区域 · 右键取色 · Space 平移' : '左键选择连续区域 · 右键取色 · Space 平移';
    mobile = brushBead || isEraser ? '点按填充连续区域 · 长按取色 · 双指缩放' : '点按选择连续区域 · 长按取色 · 双指缩放';
  } else if (editMode && isEraser) {
    Icon = Eraser;
    label = '橡皮';
    desktop = '按住左键擦除 · 右键取色 · Space 平移';
    mobile = '点按或拖动擦除 · 长按取色 · 双指缩放';
  } else if (editMode && brushBead) {
    Icon = Brush;
    label = `画笔 ${brushBead.code}`;
    desktop = '按住左键绘制 · 右键取色 · Space 平移';
    mobile = '点按或拖动绘制 · 长按取色 · 双指缩放';
  } else if (editMode) {
    label = '选择';
    desktop = '左键选择格子 · 右键取色 · Space 平移';
    mobile = '点按选择格子 · 长按取色 · 双指缩放';
  }

  return (
    <div className="tool-hint glass-toolbar" role="status" aria-live="polite">
      <span className="tool-hint-label"><Icon className="w-3.5 h-3.5" />{label}</span>
      <span className="hidden sm:inline">{desktop}</span>
      <span className="sm:hidden">{mobile}</span>
    </div>
  );
}
