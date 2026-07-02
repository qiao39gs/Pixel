import { create } from 'zustand';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../types';
import { EMPTY_BEAD, applySelectionFill, denoisePixels } from '../utils/editOperations';
import { recalculateStats } from '../utils/statsUtils';

interface WorkspaceStore {
  panelPreset: '52x52' | '78x78' | '104x104' | 'custom';
  customWidth: number;
  localAspectRatio: number;
  colorLimit: number;
  brightness: number;
  contrast: number;
  saturation: number;
  distanceAlgorithm: 'CIEDE2000' | 'CIE94' | 'CIE76' | 'WeightedRGB';
  kMedoidsOptimize: boolean;
  removeBackground: boolean;
  scale: number;
  showNumbers: boolean;
  showRulers: boolean;
  selectedBeadHighlight: string | null;
  isPanning: boolean;
  panOffset: { x: number; y: number };
  panStart: { x: number; y: number };
  editMode: boolean;
  brushBead: BeadPaletteItem | null;
  selectedCell: { x: number; y: number } | null;
  isEraser: boolean;
  wandMode: boolean;
  wandSelection: Set<string>;
  showPalettePanel: boolean;
  transformedPixels: TransformedPixel[];
  stats: IngredientStat[];
  isProcessing: boolean;
  gridWidthActual: number;
  gridHeightActual: number;
  topTrim: number;
  bottomTrim: number;
  leftTrim: number;
  rightTrim: number;
  mobileTab: 'controls' | 'canvas' | 'stats' | 'project';
  pipelineActive: boolean;
  skipNextProcess: boolean;
  currentProjectId: string | null;
  restoringProject: boolean;
  undoStack: { pixels: TransformedPixel[]; stats: IngredientStat[] }[];
  redoStack: { pixels: TransformedPixel[]; stats: IngredientStat[] }[];

  // Simple setters
  setPanelPreset: (v: WorkspaceStore['panelPreset']) => void;
  setCustomWidth: (v: number) => void;
  setLocalAspectRatio: (v: number) => void;
  setColorLimit: (v: number) => void;
  setBrightness: (v: number) => void;
  setContrast: (v: number) => void;
  setSaturation: (v: number) => void;
  setDistanceAlgorithm: (v: WorkspaceStore['distanceAlgorithm']) => void;
  setKMedoidsOptimize: (v: boolean) => void;
  setRemoveBackground: (v: boolean) => void;
  setScale: (v: number) => void;
  setShowNumbers: (v: boolean) => void;
  setShowRulers: (v: boolean) => void;
  setSelectedBeadHighlight: (v: string | null) => void;
  setIsPanning: (v: boolean) => void;
  setPanOffset: (v: { x: number; y: number }) => void;
  setPanStart: (v: { x: number; y: number }) => void;
  setEditMode: (v: boolean) => void;
  setBrushBead: (v: BeadPaletteItem | null) => void;
  setSelectedCell: (v: { x: number; y: number } | null) => void;
  setIsEraser: (v: boolean) => void;
  setWandMode: (v: boolean) => void;
  setWandSelection: (v: Set<string>) => void;
  setShowPalettePanel: (v: boolean) => void;
  setTransformedPixels: (v: TransformedPixel[]) => void;
  setStats: (v: IngredientStat[]) => void;
  setIsProcessing: (v: boolean) => void;
  setGridWidthActual: (v: number) => void;
  setGridHeightActual: (v: number) => void;
  setMobileTab: (v: WorkspaceStore['mobileTab']) => void;
  setPipelineActive: (v: boolean) => void;

  // Complex actions
  pushUndo: () => void;
  applyBrush: (x: number, y: number, gridWidth: number) => void;
  applyWandFill: (cell: { x: number; y: number }, selection: Set<string>, targetBead: BeadPaletteItem, gridWidth: number) => void;
  undo: () => void;
  redo: () => void;
  denoise: (gridWidth: number, gridHeight: number, palette: BeadPaletteItem[]) => void;
  swapColor: (sourceCode: string, targetBead: BeadPaletteItem) => void;
  loadProject: (pixels: TransformedPixel[], gridWidth: number, gridHeight: number, stats: IngredientStat[], settings: { colorLimit: number; distanceAlgorithm: string; removeBackground: boolean; brightness: number; contrast: number; saturation: number; panelPreset?: string; customWidth?: number; kMedoidsOptimize?: boolean }, hasOriginalImage?: boolean, projectId?: string) => void;
  autoDetectTrim: (gridWidth: number, gridHeight: number) => void;
  setTopTrim: (v: number) => void;
  setBottomTrim: (v: number) => void;
  setLeftTrim: (v: number) => void;
  setRightTrim: (v: number) => void;
  applyTrim: (gridWidth: number, gridHeight: number) => void;
}

const UNDO_LIMIT = 50;
type Snapshot = { pixels: TransformedPixel[]; stats: IngredientStat[] };
// 压入当前状态快照并清空 redo，供各编辑 action 复用
const pushSnapshot = (s: WorkspaceStore): { undoStack: Snapshot[]; redoStack: Snapshot[] } => {
  const stack = [...s.undoStack, { pixels: [...s.transformedPixels], stats: [...s.stats] }];
  return { undoStack: stack.length > UNDO_LIMIT ? stack.slice(-UNDO_LIMIT) : stack, redoStack: [] };
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  panelPreset: '52x52',
  customWidth: 52,
  localAspectRatio: 1,
  colorLimit: 12,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  distanceAlgorithm: 'CIEDE2000',
  kMedoidsOptimize: false,
  removeBackground: true,
  scale: 14,
  showNumbers: true,
  showRulers: true,
  selectedBeadHighlight: null,
  isPanning: false,
  panOffset: { x: 0, y: 0 },
  panStart: { x: 0, y: 0 },
  editMode: false,
  brushBead: null,
  selectedCell: null,
  isEraser: false,
  wandMode: false,
  wandSelection: new Set(),
  showPalettePanel: false,
  transformedPixels: [],
  stats: [],
  isProcessing: false,
  gridWidthActual: 52,
  gridHeightActual: 52,
  topTrim: 0,
  bottomTrim: 0,
  leftTrim: 0,
  rightTrim: 0,
  mobileTab: 'canvas' as const,
  pipelineActive: true,
  skipNextProcess: false,
  currentProjectId: null,
  restoringProject: false,
  undoStack: [],
  redoStack: [],

  setPanelPreset: (v) => set({ panelPreset: v }),
  setCustomWidth: (v) => set({ customWidth: v }),
  setLocalAspectRatio: (v) => set({ localAspectRatio: v }),
  setColorLimit: (v) => set({ colorLimit: v }),
  setBrightness: (v) => set({ brightness: v }),
  setContrast: (v) => set({ contrast: v }),
  setSaturation: (v) => set({ saturation: v }),
  setDistanceAlgorithm: (v) => set({ distanceAlgorithm: v }),
  setKMedoidsOptimize: (v) => set({ kMedoidsOptimize: v }),
  setRemoveBackground: (v) => set({ removeBackground: v }),
  setScale: (v) => set({ scale: v }),
  setShowNumbers: (v) => set({ showNumbers: v }),
  setShowRulers: (v) => set({ showRulers: v }),
  setSelectedBeadHighlight: (v) => set({ selectedBeadHighlight: v }),
  setIsPanning: (v) => set({ isPanning: v }),
  setPanOffset: (v) => set({ panOffset: v }),
  setPanStart: (v) => set({ panStart: v }),
  setEditMode: (v) => set({ editMode: v }),
  setBrushBead: (v) => set({ brushBead: v }),
  setSelectedCell: (v) => set({ selectedCell: v }),
  setIsEraser: (v) => set({ isEraser: v }),
  setWandMode: (v) => set({ wandMode: v }),
  setWandSelection: (v) => set({ wandSelection: v }),
  setShowPalettePanel: (v) => set({ showPalettePanel: v }),
  setTransformedPixels: (v) => set({ transformedPixels: v }),
  setStats: (v) => set({ stats: v }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  setGridWidthActual: (v) => set({ gridWidthActual: v }),
  setGridHeightActual: (v) => set({ gridHeightActual: v }),
  setTopTrim: (v) => set({ topTrim: v }),
  setBottomTrim: (v) => set({ bottomTrim: v }),
  setLeftTrim: (v) => set({ leftTrim: v }),
  setRightTrim: (v) => set({ rightTrim: v }),
  setMobileTab: (v) => set({ mobileTab: v }),
  setPipelineActive: (v) => set({ pipelineActive: v }),

  pushUndo: () => {
    set(pushSnapshot(get()));
  },

  applyBrush: (x, y, gridWidth) => {
    const s = get();
    const targetBead = s.isEraser ? EMPTY_BEAD : s.brushBead;
    if (!targetBead) return;
    const next = [...s.transformedPixels];
    next[y * gridWidth + x] = { x, y, matchedBead: targetBead };
    set({
      ...pushSnapshot(s),
      transformedPixels: next,
      stats: recalculateStats(next),
      selectedCell: { x, y },
    });
  },

  applyWandFill: (cell, selection, targetBead, gridWidth) => {
    const s = get();
    const { pixels, stats } = applySelectionFill(s.transformedPixels, selection, targetBead, gridWidth);
    set({ transformedPixels: pixels, stats, wandSelection: new Set(), selectedCell: cell });
  },

  undo: () => {
    const s = get();
    if (s.undoStack.length === 0) return;
    const stack = [...s.undoStack];
    const prev = stack.pop()!;
    const redo = [...s.redoStack, { pixels: [...s.transformedPixels], stats: [...s.stats] }];
    set({ undoStack: stack, redoStack: redo, transformedPixels: prev.pixels, stats: prev.stats, wandSelection: new Set(), selectedCell: null });
  },

  redo: () => {
    const s = get();
    if (s.redoStack.length === 0) return;
    const redo = [...s.redoStack];
    const next = redo.pop()!;
    set({ ...pushSnapshot(s), redoStack: redo, transformedPixels: next.pixels, stats: next.stats, wandSelection: new Set(), selectedCell: null });
  },

  denoise: (gridWidth, gridHeight, palette) => {
    const s = get();
    const { pixels, stats, changed } = denoisePixels(s.transformedPixels, gridWidth, gridHeight, palette);
    if (changed > 0) {
      set({
        ...pushSnapshot(s),
        transformedPixels: pixels,
        stats,
      });
    }
  },

  swapColor: (sourceCode, targetBead) => {
    const s = get();
    const next = s.transformedPixels.map(p =>
      p.matchedBead.code === sourceCode ? { ...p, matchedBead: targetBead } : p
    );
    set({
      ...pushSnapshot(s),
      transformedPixels: next,
      stats: recalculateStats(next),
    });
  },

  autoDetectTrim: (gridWidth, gridHeight) => {
    const s = get();
    let top = gridHeight, bottom = 0, left = gridWidth, right = 0;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const p = s.transformedPixels[y * gridWidth + x];
        if (p && p.matchedBead.code !== 'EMPTY') {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    if (top > bottom || left > right) return;
    set({ topTrim: top, bottomTrim: gridHeight - 1 - bottom, leftTrim: left, rightTrim: gridWidth - 1 - right });
  },
  applyTrim: (gridWidth, gridHeight) => {
    const s = get();
    const { topTrim, bottomTrim, leftTrim, rightTrim } = s;
    if (topTrim + bottomTrim + leftTrim + rightTrim === 0) return;
    const newWidth = gridWidth - leftTrim - rightTrim;
    const newHeight = gridHeight - topTrim - bottomTrim;
    if (newWidth <= 0 || newHeight <= 0) return;
    const result: TransformedPixel[] = [];
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const src = s.transformedPixels[(topTrim + y) * gridWidth + (leftTrim + x)];
        result.push({ x, y, matchedBead: src.matchedBead });
      }
    }
    const stack = pushSnapshot(s);
    set({
      ...stack,
      transformedPixels: result,
      stats: recalculateStats(result),
      gridWidthActual: newWidth,
      gridHeightActual: newHeight,
      topTrim: 0, bottomTrim: 0, leftTrim: 0, rightTrim: 0,
    });
  },

  loadProject: (pixels, gridWidth, gridHeight, stats, settings, hasOriginalImage, projectId) => {
    const preset = (settings.panelPreset as WorkspaceStore['panelPreset']) || 'custom';
    set({
      transformedPixels: pixels,
      stats,
      gridWidthActual: gridWidth,
      gridHeightActual: gridHeight,
      colorLimit: settings.colorLimit,
      distanceAlgorithm: settings.distanceAlgorithm as WorkspaceStore['distanceAlgorithm'],
      kMedoidsOptimize: settings.kMedoidsOptimize ?? false,
      removeBackground: settings.removeBackground,
      brightness: settings.brightness,
      contrast: settings.contrast,
      saturation: settings.saturation,
      panelPreset: preset,
      customWidth: settings.customWidth || gridWidth,
      localAspectRatio: gridWidth / gridHeight,
      undoStack: [],
      redoStack: [],
      wandSelection: new Set(),
      selectedCell: null,
      editMode: false,
      brushBead: null,
      isEraser: false,
      wandMode: false,
      topTrim: 0,
      bottomTrim: 0,
      leftTrim: 0,
      rightTrim: 0,
      panOffset: { x: 0, y: 0 },
      pipelineActive: hasOriginalImage === true,
      skipNextProcess: hasOriginalImage === true,
      restoringProject: true,
      currentProjectId: projectId ?? null,
    });
  },
}));
