import React, { useMemo, useRef, useEffect } from 'react';
import { TransformedPixel, IngredientStat } from '../types';
import { BEAD_PALETTE } from '../data/palette';
import { hexToRgb, rgbToLab } from '../colorUtils';
import { ASPECT_RATIOS } from '../utils/constants';
import { useImageProcessing } from '../hooks/useImageProcessing';
import { useImageEnhancement } from '../hooks/useImageEnhancement';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import { useWorkspaceStore } from '../store/workspaceStore';
import EditorFrame from './workspace/EditorFrame';

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
  const hoverBeadHighlight = useWorkspaceStore(s => s.hoverBeadHighlight);
  const editMode = useWorkspaceStore(s => s.editMode);
  const selectedCell = useWorkspaceStore(s => s.selectedCell);
  const wandMode = useWorkspaceStore(s => s.wandMode);
  const wandSelection = useWorkspaceStore(s => s.wandSelection);
  const isEraser = useWorkspaceStore(s => s.isEraser);
  const brushBead = useWorkspaceStore(s => s.brushBead);
  const showPalettePanel = useWorkspaceStore(s => s.showPalettePanel);
  const undo = useWorkspaceStore(s => s.undo);
  const redo = useWorkspaceStore(s => s.redo);

  const setEditMode = useWorkspaceStore(s => s.setEditMode);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const setIsEraser = useWorkspaceStore(s => s.setIsEraser);
  const setShowPalettePanel = useWorkspaceStore(s => s.setShowPalettePanel);
  const setWandMode = useWorkspaceStore(s => s.setWandMode);
  const setWandSelection = useWorkspaceStore(s => s.setWandSelection);
  const setSelectedCell = useWorkspaceStore(s => s.setSelectedCell);
  const setDragMode = useWorkspaceStore(s => s.setDragMode);

  const { gridWidth, gridHeight } = useMemo(() => {
    const h = (w: number) => aspectRatio === 'auto' ? Math.max(1, Math.round(w / localAspectRatio)) : Math.round(w * (ASPECT_RATIOS[aspectRatio] ?? 1));
    const w = panelPreset === '52x52' ? 52 : panelPreset === '78x78' ? 78 : panelPreset === '104x104' ? 104 : Math.min(150, Math.max(5, customWidth));
    return { gridWidth: w, gridHeight: h(w) };
  }, [panelPreset, customWidth, aspectRatio, localAspectRatio]);

  const currentPalette = useMemo(() =>
    BEAD_PALETTE.filter(i => i.brand === 'MGB').map(i => ({ ...i, rgb: hexToRgb(i.hex), lab: rgbToLab(hexToRgb(i.hex)) })),
  []);

  const { effectiveImage, triggerEnhance } = useImageEnhancement(croppedImageDataUrl);

  useImageProcessing({ croppedImageDataUrl: effectiveImage, removeBackground, colorLimit, distanceAlgorithm, kMedoidsOptimize, currentPalette, gridWidth, gridHeight, brightness, contrast, saturation });

  useCanvasRenderer({ canvasRef, transformedPixels, gridWidth: gridWidthActual, gridHeight: gridHeightActual, scale, showNumbers, showRulers, selectedBeadHighlight, hoverBeadHighlight, editMode, selectedCell, wandMode, wandSelection });

  // 键盘快捷键（Excalidraw 风格）
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const tag = (el as HTMLElement | null)?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA';
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      // 撤销/重做（对编辑模式无要求）
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'v') { e.preventDefault(); setEditMode(!editMode); setBrushBead(null); setSelectedCell(null); setIsEraser(false); setWandMode(false); setWandSelection(new Set()); return; }
      if (k === 'b' && editMode) { e.preventDefault(); setShowPalettePanel(!showPalettePanel); return; }
      if (k === 'e' && editMode) { e.preventDefault(); setIsEraser(!isEraser); setBrushBead(null); return; }
      if (k === 'w' && editMode) { e.preventDefault(); setWandMode(!wandMode); setWandSelection(new Set()); return; }
      if (k === 'escape') { if (editMode) setEditMode(false); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editMode, showPalettePanel, isEraser, wandMode, brushBead, undo, redo, setEditMode, setBrushBead, setSelectedCell, setIsEraser, setShowPalettePanel, setWandMode, setWandSelection]);

  // Space 临时平移（按住 Space 切换拖拽模式）
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const tag = (el as HTMLElement | null)?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA';
    };
    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === 'Space') { setDragMode(true); e.preventDefault(); }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setDragMode(false);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [setDragMode]);

  return (
    <EditorFrame
      canvasRef={canvasRef}
      containerRef={containerRef}
      currentPalette={currentPalette}
      onGeneratePng={onGeneratePng}
      onGeneratePdf={onGeneratePdf}
      onReset={onReset}
      onTriggerEnhance={triggerEnhance}
      croppedImageDataUrl={croppedImageDataUrl}
      aspectRatio={aspectRatio}
      onRestoreImage={onRestoreImage}
    />
  );
}