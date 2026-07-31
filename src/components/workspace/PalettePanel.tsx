import React from 'react';
import { hexToRgb, luminance } from '../../colorUtils';
import { COLOR_GROUPS } from '../../data/palette';
import { PaletteItemWithCache } from '../../utils/quantizeImage';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Palette } from 'lucide-react';
import PanelHeader from './PanelHeader';

interface Props {
  currentPalette: PaletteItemWithCache[];
}

export default function PalettePanel({ currentPalette }: Props) {
  const editMode = useWorkspaceStore(s => s.editMode);
  const showPalettePanel = useWorkspaceStore(s => s.showPalettePanel);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const setIsEraser = useWorkspaceStore(s => s.setIsEraser);
  const setShowPalettePanel = useWorkspaceStore(s => s.setShowPalettePanel);
  const brushBead = useWorkspaceStore(s => s.brushBead);

  if (!editMode || !showPalettePanel) return null;

  return (
    <section className="editor-palette-panel glass-panel animate-panel-pop" aria-label="画笔色板">
      <PanelHeader icon={<Palette className="h-4 w-4" />} title="画笔色板" description={brushBead ? <span className="font-mono">当前色号 {brushBead.code}</span> : '选择颜色后在图纸上绘制'} onClose={() => setShowPalettePanel(false)} closeLabel="关闭画笔色板" />
      <div className="flex-1 overflow-y-auto p-3 scrollbar-dark">
        {COLOR_GROUPS.map(group => {
          const groupBeads = currentPalette.filter(b => b.series === group.series);
          if (groupBeads.length === 0) return null;
          return (
            <div key={group.series} className="mb-3 last:mb-0">
              <div className="text-[12px] font-bold text-stone-500 mb-1.5">{group.name}</div>
              <div className="flex flex-wrap gap-1">
                {groupBeads.map(b => (
                  <button
                    key={b.code}
                    onClick={() => { setBrushBead(b); setIsEraser(false); }}
                    className="w-9 h-9 rounded-lg border transition-all cursor-pointer relative group/bead hover:scale-110 hover:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8570A]"
                    style={{
                      backgroundColor: b.hex,
                      borderColor: brushBead?.code === b.code ? '#E8570A' : 'rgba(0,0,0,0.08)',
                      boxShadow: brushBead?.code === b.code ? '0 0 0 2px #E8570A' : 'none',
                    }}
                    title={b.code + ' ' + b.name}
                  >
                    <span
                      className="absolute inset-0 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover/bead:opacity-100"
                      style={{ color: luminance(hexToRgb(b.hex)) > 140 ? '#000' : '#fff' }}
                    >{b.code}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
