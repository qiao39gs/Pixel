import React from 'react';
import { Brush, Square, Circle } from 'lucide-react';
import PanelHeader from './PanelHeader';
import { useWorkspaceStore } from '../../store/workspaceStore';

const MAX_HALF = 4; // 最大粗细 9 格 → 预览网格 9×9

export default function BrushPanel() {
  const editMode = useWorkspaceStore(s => s.editMode);
  const brushPanelOpen = useWorkspaceStore(s => s.brushPanelOpen);
  const setBrushPanelOpen = useWorkspaceStore(s => s.setBrushPanelOpen);
  const brushSize = useWorkspaceStore(s => s.brushSize);
  const setBrushSize = useWorkspaceStore(s => s.setBrushSize);
  const brushShape = useWorkspaceStore(s => s.brushShape);
  const setBrushShape = useWorkspaceStore(s => s.setBrushShape);

  if (!editMode || !brushPanelOpen) return null;

  const half = Math.max(0, Math.floor((brushSize - 1) / 2));
  const inShape = (dx: number, dy: number) =>
    brushShape === 'circle'
      ? dx * dx + dy * dy <= (half + 0.5) * (half + 0.5)
      : Math.abs(dx) <= half && Math.abs(dy) <= half;

  return (
    <section className="editor-brush-panel glass-panel animate-panel-pop" aria-label="画笔粗细设置">
      <PanelHeader
        icon={<Brush className="w-4 h-4" />}
        title="画笔粗细"
        description="同时作用于画笔和橡皮"
        onClose={() => setBrushPanelOpen(false)}
        closeLabel="关闭画笔粗细设置"
      />
      <div className="flex flex-col gap-4 p-4">
        {/* 形状选择 */}
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold text-slate-500">落笔形状</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setBrushShape('square')}
              className={'flex items-center justify-center gap-1.5 h-9 text-[13px] font-bold rounded-lg border transition-all cursor-pointer ' + (brushShape === 'square' ? 'bg-orange-50 text-[#C84708] border-orange-300 shadow-sm' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50')}
            >
              <Square className="w-3.5 h-3.5" />
              正方形
            </button>
            <button
              onClick={() => setBrushShape('circle')}
              className={'flex items-center justify-center gap-1.5 h-9 text-[13px] font-bold rounded-lg border transition-all cursor-pointer ' + (brushShape === 'circle' ? 'bg-orange-50 text-[#C84708] border-orange-300 shadow-sm' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50')}
            >
              <Circle className="w-3.5 h-3.5" />
              圆形
            </button>
          </div>
        </div>

        {/* 粗细滑块 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-slate-500">粗细（最大宽度）</span>
            <span className="font-mono text-[13px] font-bold text-[#E8570A]">{brushSize} 格</span>
          </div>
          <input
            type="range" min="1" max="9" step="2" value={brushSize}
            onChange={e => setBrushSize(parseInt(e.target.value))}
            className="w-full h-2.5 accent-[#E8570A] bg-stone-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-bold text-slate-400">
            <span>1</span><span>3</span><span>5</span><span>7</span><span>9</span>
          </div>
        </div>

        {/* 落点预览 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-slate-500">落点预览</span>
          <div className="flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200/60 p-2">
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(' + (MAX_HALF * 2 + 1) + ', 14px)' }}>
              {Array.from({ length: (MAX_HALF * 2 + 1) * (MAX_HALF * 2 + 1) }, (_, i) => {
                const dx = (i % (MAX_HALF * 2 + 1)) - MAX_HALF;
                const dy = Math.floor(i / (MAX_HALF * 2 + 1)) - MAX_HALF;
                const filled = inShape(dx, dy);
                const isCenter = dx === 0 && dy === 0;
                return (
                  <div
                    key={i}
                    className={'w-3.5 h-3.5 rounded-[3px] transition-colors ' + (filled ? 'bg-[#E8570A]/80' : 'bg-stone-200/60') + (isCenter ? ' ring-1 ring-[#E8570A]' : '')}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <p className="text-[12px] text-slate-500 leading-relaxed">
          调整后画笔与橡皮都会按此形状和粗细落笔；粗细 1 格为单格绘制。
        </p>
      </div>
    </section>
  );
}
