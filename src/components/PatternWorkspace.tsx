import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../types';
import { BEAD_PALETTE } from '../data/palette';
import { hexToRgb, rgbToLab } from '../colorUtils';
import { useImageProcessing } from '../hooks/useImageProcessing';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import { EMPTY_BEAD, applySelectionFill, denoisePixels } from '../utils/editOperations';
import ControlPanel from './workspace/ControlPanel';
import CanvasViewport from './workspace/CanvasViewport';
import StatsPanel from './workspace/StatsPanel';
import { Sliders, Grid3X3, Layers } from 'lucide-react';

interface PatternWorkspaceProps {
  croppedImageDataUrl: string;
  onReset: () => void;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onGeneratePng: (pixels: TransformedPixel[], width: number, height: number, stats: IngredientStat[], options?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], width: number, height: number, stats: IngredientStat[], options?: { showRulers: boolean; showNumbers: boolean }) => void;
}

export default function PatternWorkspace({ croppedImageDataUrl, onReset, aspectRatio, onGeneratePng, onGeneratePdf }: PatternWorkspaceProps) {
  const [panelPreset, setPanelPreset] = useState<'52x52' | '78x78' | '104x104' | 'custom'>('52x52');
  const [customWidth, setCustomWidth] = useState(52);
  const [localAspectRatio, setLocalAspectRatio] = useState(1);
  const [mobileTab, setMobileTab] = useState<'controls' | 'canvas' | 'stats'>('canvas');

  const { gridWidth, gridHeight } = useMemo(() => {
    const RATIOS: Record<string, number> = { '1:1': 1, '4:3': 3/4, '3:4': 4/3, '16:9': 9/16, '9:16': 16/9 };
    const h = (w: number) => aspectRatio === 'auto' ? Math.max(1, Math.round(w / localAspectRatio)) : Math.round(w * (RATIOS[aspectRatio] ?? 1));
    const w = panelPreset === '52x52' ? 52 : panelPreset === '78x78' ? 78 : panelPreset === '104x104' ? 104 : Math.min(150, Math.max(5, customWidth));
    return { gridWidth: w, gridHeight: h(w) };
  }, [panelPreset, customWidth, aspectRatio, localAspectRatio]);

  const [colorLimit, setColorLimit] = useState(12);
  const [distanceAlgorithm, setDistanceAlgorithm] = useState<'CIEDE2000' | 'CIE94' | 'CIE76' | 'WeightedRGB'>('CIEDE2000');
  const [removeBackground, setRemoveBackground] = useState(true);
  const [scale, setScale] = useState(14);
  const [showNumbers, setShowNumbers] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [selectedBeadHighlight, setSelectedBeadHighlight] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const [brushBead, setBrushBead] = useState<BeadPaletteItem | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [isEraser, setIsEraser] = useState(false);
  const [wandMode, setWandMode] = useState(false);
  const [wandSelection, setWandSelection] = useState<Set<string>>(new Set());
  const [showPalettePanel, setShowPalettePanel] = useState(false);
  const undoStackRef = useRef<{ pixels: TransformedPixel[]; stats: IngredientStat[] }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentPalette = useMemo(() =>
    BEAD_PALETTE.filter(i => i.brand === 'MGB').map(i => ({ ...i, rgb: hexToRgb(i.hex), lab: rgbToLab(hexToRgb(i.hex)) })),
  []);

  const { transformedPixels, stats, isProcessing, imageAspectRatio, setTransformedPixels, setStats } =
    useImageProcessing({ croppedImageDataUrl, panelPreset, customWidth, aspectRatio, removeBackground, colorLimit, distanceAlgorithm, currentPalette, gridWidth, gridHeight });

  useEffect(() => { setLocalAspectRatio(imageAspectRatio); }, [imageAspectRatio]);

  useCanvasRenderer({ canvasRef, transformedPixels, gridWidth, gridHeight, scale, showNumbers, showRulers, selectedBeadHighlight, editMode, selectedCell, wandMode, wandSelection });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pushUndo = useCallback(() => {
    undoStackRef.current.push({ pixels: [...transformedPixels], stats: [...stats] });
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
  }, [transformedPixels, stats]);

  const applyBrush = useCallback((x: number, y: number) => {
    const targetBead = isEraser ? EMPTY_BEAD : brushBead;
    if (!targetBead) return;
    pushUndo();
    setTransformedPixels(prev => { const next = [...prev]; next[y * gridWidth + x] = { x, y, matchedBead: targetBead }; return next; });
    setStats(() => {
      const m = new Map<string, { bead: BeadPaletteItem; count: number }>();
      transformedPixels.forEach(p => { if (p.matchedBead.code === 'EMPTY') return; const c = p.matchedBead.code; const e = m.get(c); if (e) e.count++; else m.set(c, { bead: p.matchedBead, count: 1 }); });
      if (targetBead.code !== 'EMPTY') { const e = m.get(targetBead.code); if (e) e.count++; else m.set(targetBead.code, { bead: targetBead, count: 1 }); }
      const old = transformedPixels[y * gridWidth + x];
      if (old && old.matchedBead.code !== 'EMPTY') { const oe = m.get(old.matchedBead.code); if (oe) { oe.count--; if (oe.count <= 0) m.delete(old.matchedBead.code); } }
      return Array.from(m.values()).sort((a, b) => b.count - a.count);
    });
    setSelectedCell({ x, y });
  }, [isEraser, brushBead, transformedPixels, gridWidth, pushUndo, setTransformedPixels, setStats]);

  const applyWandFill = useCallback((cell: { x: number; y: number }, selection: Set<string>, targetBead: BeadPaletteItem) => {
    const { pixels, stats: s } = applySelectionFill(transformedPixels, selection, targetBead, gridWidth);
    setTransformedPixels(pixels); setStats(s); setWandSelection(new Set()); setSelectedCell(cell);
  }, [transformedPixels, gridWidth, setTransformedPixels, setStats]);

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    setTransformedPixels(prev.pixels); setStats(prev.stats); setWandSelection(new Set()); setSelectedCell(null);
  }, [setTransformedPixels, setStats]);

  const denoise = useCallback(() => {
    pushUndo();
    const { pixels, stats: s, changed } = denoisePixels(transformedPixels, gridWidth, gridHeight, currentPalette);
    if (changed > 0) { setTransformedPixels(pixels); setStats(s); }
  }, [transformedPixels, gridWidth, gridHeight, currentPalette, pushUndo, setTransformedPixels, setStats]);

  return (
    <div className="w-full flex flex-col">
      {/* Mobile tab bar */}
      <div className="lg:hidden sticky top-14 z-40 bg-white/95 backdrop-blur-sm border-b border-zinc-100 flex mb-4">
        {([
          { id: 'controls', label: '参数', Icon: Sliders },
          { id: 'canvas',   label: '画布', Icon: Grid3X3 },
          { id: 'stats',    label: '色卡', Icon: Layers },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
              mobileTab === id
                ? 'text-[#E8570A] border-[#E8570A]'
                : 'text-zinc-400 border-transparent hover:text-zinc-600'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls — mobile: only when controls tab active */}
        <div className={mobileTab !== 'controls' ? 'hidden lg:contents' : undefined}>
          <ControlPanel
            panelPreset={panelPreset} setPanelPreset={setPanelPreset}
            customWidth={customWidth} setCustomWidth={setCustomWidth}
            imageAspectRatio={imageAspectRatio} aspectRatio={aspectRatio}
            colorLimit={colorLimit} setColorLimit={setColorLimit}
            distanceAlgorithm={distanceAlgorithm} setDistanceAlgorithm={setDistanceAlgorithm}
            removeBackground={removeBackground} setRemoveBackground={setRemoveBackground}
            scale={scale} setScale={setScale} setScaleDirect={setScale}
            showNumbers={showNumbers} setShowNumbers={setShowNumbers}
            showRulers={showRulers} setShowRulers={setShowRulers}
            onReset={onReset}
          />
        </div>

        <div className="w-full lg:col-span-8 flex flex-col gap-6">
          {/* Canvas — mobile: hidden when stats tab */}
          <div className={mobileTab === 'stats' ? 'hidden lg:block' : undefined}>
            <CanvasViewport
              canvasRef={canvasRef} containerRef={containerRef}
              isProcessing={isProcessing} panOffset={panOffset} isPanning={isPanning} panStart={panStart}
              editMode={editMode} brushBead={brushBead} isEraser={isEraser}
              wandMode={wandMode} wandSelection={wandSelection} selectedCell={selectedCell}
              showPalettePanel={showPalettePanel} currentPalette={currentPalette}
              selectedBeadHighlight={selectedBeadHighlight}
              gridWidth={gridWidth} gridHeight={gridHeight} statsCount={stats.length}
              showRulers={showRulers} showNumbers={showNumbers} scale={scale}
              transformedPixels={transformedPixels} stats={stats}
              setIsPanning={setIsPanning} setPanOffset={setPanOffset} setPanStart={setPanStart}
              setEditMode={setEditMode} setBrushBead={setBrushBead} setSelectedCell={setSelectedCell}
              setIsEraser={setIsEraser} setWandMode={setWandMode} setWandSelection={setWandSelection}
              setShowPalettePanel={setShowPalettePanel} setSelectedBeadHighlight={setSelectedBeadHighlight}
              applyBrush={applyBrush} applyWandFill={applyWandFill}
              pushUndo={pushUndo} onUndo={undo} onDenoise={denoise}
              onGeneratePng={onGeneratePng} onGeneratePdf={onGeneratePdf}
            />
          </div>
          {/* Stats — mobile: hidden when canvas tab */}
          <div className={mobileTab === 'canvas' ? 'hidden lg:block' : undefined}>
            <StatsPanel
              stats={stats} editMode={editMode}
              setBrushBead={setBrushBead} selectedBeadHighlight={selectedBeadHighlight}
              setSelectedBeadHighlight={setSelectedBeadHighlight} transformedPixels={transformedPixels}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
