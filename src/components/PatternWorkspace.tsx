import React, { useMemo, useRef, useEffect } from 'react';
import { Sliders, Grid3X3, Layers } from 'lucide-react';
import { TransformedPixel, IngredientStat } from '../types';
import { BEAD_PALETTE } from '../data/palette';
import { hexToRgb, rgbToLab } from '../colorUtils';
import { useImageProcessing } from '../hooks/useImageProcessing';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import { useWorkspaceStore } from '../store/workspaceStore';
import ControlPanel from './workspace/ControlPanel';
import CanvasViewport from './workspace/CanvasViewport';
import StatsPanel from './workspace/StatsPanel';

interface PatternWorkspaceProps {
  croppedImageDataUrl: string;
  onReset: () => void;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onGeneratePng: (pixels: TransformedPixel[], width: number, height: number, stats: IngredientStat[], options?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], width: number, height: number, stats: IngredientStat[], options?: { showRulers: boolean; showNumbers: boolean }) => void;
}

export default function PatternWorkspace({ croppedImageDataUrl, onReset, aspectRatio, onGeneratePng, onGeneratePdf }: PatternWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const panelPreset = useWorkspaceStore(s => s.panelPreset);
  const customWidth = useWorkspaceStore(s => s.customWidth);
  const localAspectRatio = useWorkspaceStore(s => s.localAspectRatio);
  const colorLimit = useWorkspaceStore(s => s.colorLimit);
  const brightness = useWorkspaceStore(s => s.brightness);
  const contrast = useWorkspaceStore(s => s.contrast);
  const saturation = useWorkspaceStore(s => s.saturation);
  const distanceAlgorithm = useWorkspaceStore(s => s.distanceAlgorithm);
  const removeBackground = useWorkspaceStore(s => s.removeBackground);

  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const scale = useWorkspaceStore(s => s.scale);
  const showNumbers = useWorkspaceStore(s => s.showNumbers);
  const showRulers = useWorkspaceStore(s => s.showRulers);
  const selectedBeadHighlight = useWorkspaceStore(s => s.selectedBeadHighlight);
  const editMode = useWorkspaceStore(s => s.editMode);
  const selectedCell = useWorkspaceStore(s => s.selectedCell);
  const wandMode = useWorkspaceStore(s => s.wandMode);
  const wandSelection = useWorkspaceStore(s => s.wandSelection);

  const undo = useWorkspaceStore(s => s.undo);
  const setScale = useWorkspaceStore(s => s.setScale);

  const { gridWidth, gridHeight } = useMemo(() => {
    const RATIOS: Record<string, number> = { '1:1': 1, '4:3': 3/4, '3:4': 4/3, '16:9': 9/16, '9:16': 16/9 };
    const h = (w: number) => aspectRatio === 'auto' ? Math.max(1, Math.round(w / localAspectRatio)) : Math.round(w * (RATIOS[aspectRatio] ?? 1));
    const w = panelPreset === '52x52' ? 52 : panelPreset === '78x78' ? 78 : panelPreset === '104x104' ? 104 : Math.min(150, Math.max(5, customWidth));
    return { gridWidth: w, gridHeight: h(w) };
  }, [panelPreset, customWidth, aspectRatio, localAspectRatio]);

  const currentPalette = useMemo(() =>
    BEAD_PALETTE.filter(i => i.brand === 'MGB').map(i => ({ ...i, rgb: hexToRgb(i.hex), lab: rgbToLab(hexToRgb(i.hex)) })),
  []);

  useImageProcessing({ croppedImageDataUrl, panelPreset, customWidth, aspectRatio, removeBackground, colorLimit, distanceAlgorithm, currentPalette, gridWidth, gridHeight, brightness, contrast, saturation });

  useCanvasRenderer({ canvasRef, transformedPixels, gridWidth, gridHeight, scale, showNumbers, showRulers, selectedBeadHighlight, editMode, selectedCell, wandMode, wandSelection });

  // Auto-fit canvas scale to viewport on grid change
  useEffect(() => {
    const rulerSize = showRulers ? 32 : 0;
    const maxW = Math.min(window.innerWidth - 24, 700);
    const fit = Math.max(4, Math.floor((maxW - rulerSize) / gridWidth));
    setScale(Math.min(14, fit));
  }, [gridWidth]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  return (
    <div className="w-full flex flex-col">
      {/* Tab bar — reads from store directly now via CanvasViewport */}
      <TabBar />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <ControlPanel onReset={onReset} />
        <div className="w-full lg:col-span-8 flex flex-col gap-6">
          <CanvasViewport canvasRef={canvasRef} containerRef={containerRef} gridWidth={gridWidth} gridHeight={gridHeight} currentPalette={currentPalette} onGeneratePng={onGeneratePng} onGeneratePdf={onGeneratePdf} />
          <StatsPanel />
        </div>
      </div>
    </div>
  );
}

function TabBar() {
  const mobileTab = useWorkspaceStore(s => s.mobileTab);
  const setMobileTab = useWorkspaceStore(s => s.setMobileTab);
  return (
    <div className="lg:hidden sticky top-14 z-40 bg-white/95 backdrop-blur-sm border-b border-zinc-100 flex mb-4">
      {([
        { id: 'controls' as const, label: '参数', Icon: Sliders },
        { id: 'canvas' as const,   label: '画布', Icon: Grid3X3 },
        { id: 'stats' as const,    label: '色卡', Icon: Layers },
      ]).map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => setMobileTab(id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
            mobileTab === id ? 'text-[#E8570A] border-[#E8570A]' : 'text-zinc-400 border-transparent hover:text-zinc-600'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
