import React, { useState, useEffect } from 'react';
import { PenTool, Check } from 'lucide-react';
import PanelHeader from './PanelHeader';
import { PaletteItemWithCache } from '../../utils/quantizeImage';
import { hexToRgb, luminance } from '../../colorUtils';
import { COLOR_GROUPS } from '../../data/palette';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface Props {
  currentPalette: PaletteItemWithCache[];
}

export default function StrokePanel({ currentPalette }: Props) {
  const editMode = useWorkspaceStore(s => s.editMode);
  const strokePanelOpen = useWorkspaceStore(s => s.strokePanelOpen);
  const setStrokePanelOpen = useWorkspaceStore(s => s.setStrokePanelOpen);
  const strokeColor = useWorkspaceStore(s => s.strokeColor);
  const setStrokeColor = useWorkspaceStore(s => s.setStrokeColor);
  const strokeThickness = useWorkspaceStore(s => s.strokeThickness);
  const setStrokeThickness = useWorkspaceStore(s => s.setStrokeThickness);
  const applyStroke = useWorkspaceStore(s => s.applyStroke);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);

  // 浏览中的色系；选中颜色变化时自动跟随其所属色系
  const [activeSeries, setActiveSeries] = useState<string>(
    strokeColor?.series || COLOR_GROUPS[0].series,
  );
  useEffect(() => {
    if (strokeColor) setActiveSeries(strokeColor.series);
  }, [strokeColor]);

  if (!editMode || !strokePanelOpen) return null;

  // 去重并保留色号顺序
  const swatches = currentPalette.filter((b, i, arr) => arr.findIndex(p => p.code === b.code) === i);
  const group = COLOR_GROUPS.find(g => g.series === activeSeries) ?? COLOR_GROUPS[0];
  const groupSwatches = swatches.filter(b => b.series === group.series);

  return (
    <section className="editor-stroke-panel glass-panel animate-panel-pop" aria-label="描边工具">
      <PanelHeader
        icon={<PenTool className="w-4 h-4" />}
        title="描边"
        description="沿内容外侧空位向外描边"
        onClose={() => setStrokePanelOpen(false)}
        closeLabel="关闭描边工具"
      />
      <div className="flex flex-col gap-4 overflow-y-auto p-4 scrollbar-dark">
        {/* 颜色选择：按色系分组，先选系列再看色块，避免长滚动 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-slate-500">描边颜色</span>
            {strokeColor && (
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-stone-600">
                <span className="inline-block w-3.5 h-3.5 rounded-md border border-black/10" style={{ backgroundColor: strokeColor.hex }} />
                {strokeColor.code} · {strokeColor.name}
              </span>
            )}
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-dark -mx-1 px-1 pb-0.5">
            {COLOR_GROUPS.map(g => (
              <button
                key={g.series}
                onClick={() => setActiveSeries(g.series)}
                title={g.name}
                className={'h-7 px-2.5 shrink-0 rounded-lg text-[12px] font-bold transition-all cursor-pointer ' + (activeSeries === g.series ? 'bg-[#E8570A] text-white shadow-sm' : 'bg-stone-100 text-stone-500 hover:bg-stone-200')}
              >
                {g.series}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto scrollbar-dark content-start">
            {groupSwatches.map(b => (
              <button
                key={b.code}
                onClick={() => setStrokeColor(b)}
                className="relative w-8 h-8 shrink-0 rounded-lg border transition-all cursor-pointer hover:scale-105"
                style={{
                  backgroundColor: b.hex,
                  borderColor: strokeColor?.code === b.code ? '#E8570A' : 'rgba(0,0,0,0.12)',
                  boxShadow: strokeColor?.code === b.code ? '0 0 0 2px #E8570A' : 'none',
                }}
                title={b.code + ' ' + b.name}
              >
                {strokeColor?.code === b.code && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check
                      className="w-3.5 h-3.5"
                      style={{ color: luminance(hexToRgb(b.hex)) > 140 ? '#000' : '#fff' }}
                    />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 粗细选择 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-slate-500">粗细（向外扩层数）</span>
            <span className="font-mono text-[13px] font-bold text-[#E8570A]">{strokeThickness} 格</span>
          </div>
          <input
            type="range" min="1" max="6" step="1" value={strokeThickness}
            onChange={e => setStrokeThickness(parseInt(e.target.value))}
            className="w-full h-2.5 accent-[#E8570A] bg-stone-200 rounded-lg cursor-pointer"
          />
        </div>

        {/* 应用 */}
        <button
          onClick={() => applyStroke(gridWidth, gridHeight)}
          disabled={!strokeColor}
          className={'flex items-center justify-center gap-1.5 h-10 text-[13px] font-bold rounded-xl transition-all cursor-pointer ' + (strokeColor ? 'bg-[#E8570A] text-white hover:bg-[#CF4707]' : 'bg-stone-100 text-stone-400 cursor-not-allowed')}
        >
          <PenTool className="w-4 h-4" />
          应用描边
        </button>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          沿所有内容的空位边缘向外描边，只填充空格，不会覆盖已有像素。
        </p>
      </div>
    </section>
  );
}
