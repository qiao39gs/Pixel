import React, { useMemo, useRef, useEffect } from 'react';
import { Sliders, Grid3X3, Layers, FolderOpen } from 'lucide-react';
import { TransformedPixel, IngredientStat } from '../types';
import { BEAD_PALETTE } from '../data/palette';
import { hexToRgb, rgbToLab } from '../colorUtils';
import { ASPECT_RATIOS } from '../utils/constants';
import { useImageProcessing } from '../hooks/useImageProcessing';
import { useImageEnhancement } from '../hooks/useImageEnhancement';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import { useWorkspaceStore } from '../store/workspaceStore';
import ControlPanel from './workspace/ControlPanel';
import CanvasViewport from './workspace/CanvasViewport';
import StatsPanel from './workspace/StatsPanel';
import ProjectPanel from './workspace/ProjectPanel';

interface PatternWorkspaceProps {
  croppedImageDataUrl: string;
  onReset: () => void;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onGeneratePng: (pixels: TransformedPixel[], width: number, height: number, stats: IngredientStat[], options?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], width: number, height: number, stats: IngredientStat[], options?: { showRulers: boolean; showNumbers: boolean }) => void;
  onRestoreImage: (image: string, aspectRatio: '1:1' | '4:3' | 'auto') => void;
}

export default function PatternWorkspace({ croppedImageDataUrl, onReset, aspectRatio, onGeneratePng, onGeneratePdf, onRestoreImage }: PatternWorkspaceProps) {
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
  const kMedoidsOptimize = useWorkspaceStore(s => s.kMedoidsOptimize);
  const removeBackground = useWorkspaceStore(s => s.removeBackground);

  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const gridWidthActual = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeightActual = useWorkspaceStore(s => s.gridHeightActual);
  const scale = useWorkspaceStore(s => s.scale);
  const showNumbers = useWorkspaceStore(s => s.showNumbers);
  const showRulers = useWorkspaceStore(s => s.showRulers);
  const selectedBeadHighlight = useWorkspaceStore(s => s.selectedBeadHighlight);
  const editMode = useWorkspaceStore(s => s.editMode);
  const selectedCell = useWorkspaceStore(s => s.selectedCell);
  const wandMode = useWorkspaceStore(s => s.wandMode);
  const wandSelection = useWorkspaceStore(s => s.wandSelection);

  const undo = useWorkspaceStore(s => s.undo);
  const redo = useWorkspaceStore(s => s.redo);
  const setScale = useWorkspaceStore(s => s.setScale);

  const { gridWidth, gridHeight } = useMemo(() => {
    const h = (w: number) => aspectRatio === 'auto' ? Math.max(1, Math.round(w / localAspectRatio)) : Math.round(w * (ASPECT_RATIOS[aspectRatio] ?? 1));
    const w = panelPreset === '52x52' ? 52 : panelPreset === '78x78' ? 78 : panelPreset === '104x104' ? 104 : Math.min(150, Math.max(5, customWidth));
    return { gridWidth: w, gridHeight: h(w) };
  }, [panelPreset, customWidth, aspectRatio, localAspectRatio]);

  const currentPalette = useMemo(() =>
    BEAD_PALETTE.filter(i => i.brand === 'MGB').map(i => ({ ...i, rgb: hexToRgb(i.hex), lab: rgbToLab(hexToRgb(i.hex)) })),
  []);

  const { effectiveImage, triggerEnhance } = useImageEnhancement(croppedImageDataUrl);

  useImageProcessing({ croppedImageDataUrl: effectiveImage, panelPreset, customWidth, aspectRatio, removeBackground, colorLimit, distanceAlgorithm, kMedoidsOptimize, currentPalette, gridWidth, gridHeight, brightness, contrast, saturation });

  useCanvasRenderer({ canvasRef, transformedPixels, gridWidth: gridWidthActual, gridHeight: gridHeightActual, scale, showNumbers, showRulers, selectedBeadHighlight, editMode, selectedCell, wandMode, wandSelection });

  // Auto-fit canvas scale to viewport on grid change
  useEffect(() => {
    const rulerSize = showRulers ? 32 : 0;
    const maxW = Math.min(window.innerWidth - 24, 700);
    const fit = Math.max(4, Math.floor((maxW - rulerSize) / gridWidthActual));
    setScale(Math.min(14, fit));
  }, [gridWidthActual, showRulers, setScale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) { redo(); } else { undo(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <div className="w-full flex flex-col">
      {/* Tab bar — reads from store directly now via CanvasViewport */}
      <TabBar />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
        <div className="lg:col-span-3"><ControlPanel onReset={onReset} onTriggerEnhance={triggerEnhance} /></div>
        <div className="w-full lg:col-span-6 flex flex-col gap-6">
          <CanvasViewport canvasRef={canvasRef} containerRef={containerRef} gridWidth={gridWidthActual} gridHeight={gridHeightActual} currentPalette={currentPalette} onGeneratePng={onGeneratePng} onGeneratePdf={onGeneratePdf} />
          <StatsPanel />
        </div>
        <div className="lg:col-span-3"><ProjectPanel onReset={onReset} croppedImageDataUrl={croppedImageDataUrl} aspectRatio={aspectRatio} onRestoreImage={onRestoreImage} /></div>
      </div>
    </div>
  );
}

function TabBar() {
  const mobileTab = useWorkspaceStore(s => s.mobileTab);
  const setMobileTab = useWorkspaceStore(s => s.setMobileTab);
  return (
    <div className="lg:hidden sticky top-12 z-40 -mx-4 px-4 -mt-6 pt-6 pb-1 bg-[#FAFAF7] border-b border-zinc-200 flex">
      {([
        { id: 'controls' as const, label: '参数', Icon: Sliders },
        { id: 'canvas' as const,   label: '画布', Icon: Grid3X3 },
        { id: 'stats' as const,    label: '色卡', Icon: Layers },
        { id: 'project' as const,  label: '项目', Icon: FolderOpen },
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
