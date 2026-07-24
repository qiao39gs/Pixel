import React from 'react';
import { hexToRgb, luminance } from '../../colorUtils';
import { COLOR_GROUPS } from '../../data/palette';
import { BeadPaletteItem } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface Props {
  currentPalette: Array<BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: any }>;
}

export default function PalettePanel({ currentPalette }: Props) {
  const editMode = useWorkspaceStore(s => s.editMode);
  const showPalettePanel = useWorkspaceStore(s => s.showPalettePanel);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const setIsEraser = useWorkspaceStore(s => s.setIsEraser);
  const brushBead = useWorkspaceStore(s => s.brushBead);

  if (!editMode || !showPalettePanel) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-[680px] max-h-[60vh] flex flex-col glass-panel rounded-2xl overflow-hidden animate-panel-pop">
      <div className="flex-1 overflow-y-auto p-3 scrollbar-dark">
        {COLOR_GROUPS.map(group => {
          const groupBeads = currentPalette.filter(b => b.series === group.series);
          if (groupBeads.length === 0) return null;
          return (
            <div key={group.series} className="mb-3 last:mb-0">
              <div className="text-[13px] font-bold text-slate-500 mb-1.5">{group.name}</div>
              <div className="flex flex-wrap gap-1">
                {groupBeads.map(b => (
                  <button
                    key={b.code}
                    onClick={() => { setBrushBead(b); setIsEraser(false); }}
                    className="w-9 h-9 rounded-lg border transition-all cursor-pointer relative group/bead hover:scale-125 hover:z-10"
                    style={{
                      backgroundColor: b.hex,
                      borderColor: brushBead?.code === b.code ? '#6366F1' : 'rgba(0,0,0,0.08)',
                      boxShadow: brushBead?.code === b.code ? '0 0 0 2px #6366F1' : 'none',
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
    </div>
  );
}