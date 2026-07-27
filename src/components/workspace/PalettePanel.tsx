import React from 'react';
import { hexToRgb, luminance } from '../../colorUtils';
import { COLOR_GROUPS } from '../../data/palette';
import { BeadPaletteItem } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Palette, X } from 'lucide-react';

interface Props {
  currentPalette: Array<BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: any }>;
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
      <header className="h-12 px-4 flex items-center gap-2 border-b border-stone-200/70 shrink-0">
        <Palette className="w-4 h-4 text-[#E8570A]" />
        <span className="text-[13px] font-bold text-stone-800">选择画笔颜色</span>
        {brushBead && <span className="ml-1 text-[11px] text-stone-500 font-mono">当前 {brushBead.code}</span>}
        <button onClick={() => setShowPalettePanel(false)} className="ml-auto p-2 -mr-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer" title="关闭色板" aria-label="关闭色板"><X className="w-4 h-4" /></button>
      </header>
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
