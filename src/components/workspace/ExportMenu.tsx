import React, { useState } from 'react';
import { ChevronDown, LayoutGrid, Award, RotateCcw } from 'lucide-react';
import { TransformedPixel, IngredientStat } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface Props {
  onGeneratePng: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onReset: () => void;
}

export default function ExportMenu({ onGeneratePng, onGeneratePdf, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);
  const stats = useWorkspaceStore(s => s.stats);
  const showRulers = useWorkspaceStore(s => s.showRulers);
  const showNumbers = useWorkspaceStore(s => s.showNumbers);

  const fire = (fn: () => void) => () => { fn(); setOpen(false); };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="glass-toolbar rounded-xl px-3 py-2 text-xs font-bold text-slate-100 hover:bg-white/15 cursor-pointer flex items-center gap-1.5 animate-toolbar-pop transition-colors"
      >
        导出 <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 glass-toolbar rounded-xl py-1.5 min-w-[200px] animate-panel-pop overflow-hidden">
            <button
              onClick={fire(() => onGeneratePng(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers }))}
              className="w-full px-3 py-2 text-left text-xs font-bold text-slate-100 hover:bg-white/10 cursor-pointer flex items-center gap-2"
            ><LayoutGrid className="w-4 h-4 text-indigo-400" />导出图片 (PNG)</button>
            <button
              onClick={fire(() => onGeneratePdf(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers }))}
              className="w-full px-3 py-2 text-left text-xs font-bold text-slate-100 hover:bg-white/10 cursor-pointer flex items-center gap-2"
            ><Award className="w-4 h-4 text-violet-400" />导出 PDF</button>
            <div className="my-1 mx-2 h-px bg-white/10" />
            <button
              onClick={() => { onReset(); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-xs font-bold text-slate-100 hover:bg-white/10 cursor-pointer flex items-center gap-2"
            ><RotateCcw className="w-4 h-4 text-amber-400" />重选图片</button>
          </div>
        </>
      )}
    </div>
  );
}