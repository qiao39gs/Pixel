import { create } from 'zustand';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../types';
import { EMPTY_BEAD } from '../utils/editOperations';
import { PatternEditor } from '../utils/patternEditor';

export type PipelineMode = 'process' | 'skipOnce' | 'skipAndHold' | 'paused';

export interface AiEnhanceOptions {
  enhanceStrength: 'light' | 'medium' | 'strong';
  flatColors: boolean;
  cartoonStyle: boolean;
  customPrompt: string;
}

interface WorkspaceStore {
  isAiEnhancing: boolean;
  aiEnhanceError: string | null;
  aiEnhancedImage: string | null;
  aiEnhanceOptions: AiEnhanceOptions;
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
  pipelineMode: PipelineMode;
  currentProjectId: string | null;
  undoStack: { pixels: TransformedPixel[]; stats: IngredientStat[] }[];
  redoStack: { pixels: TransformedPixel[]; stats: IngredientStat[] }[];

  // Simple setters
  setIsAiEnhancing: (v: boolean) => void;
  setAiEnhanceError: (v: string | null) => void;
  setAiEnhancedImage: (v: string | null) => void;
  setAiEnhanceOptions: (v: Partial<AiEnhanceOptions>) => void;
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
  setPipelineResult: (pixels: TransformedPixel[], stats: IngredientStat[]) => void;
  setTransformedPixels: (v: TransformedPixel[]) => void;
  setStats: (v: IngredientStat[]) => void;
  setIsProcessing: (v: boolean) => void;
  setGridWidthActual: (v: number) => void;
  setGridHeightActual: (v: number) => void;
  setMobileTab: (v: WorkspaceStore['mobileTab']) => void;
  setPipelineMode: (v: PipelineMode) => void;

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

const editor = new PatternEditor();

const syncEditor = () => ({
  transformedPixels: editor.pixels,
  stats: editor.stats,
  undoStack: [...editor.undoStack],
  redoStack: [...editor.redoStack],
});

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  isAiEnhancing: false,
  aiEnhanceError: null,
  aiEnhancedImage: null,
  aiEnhanceOptions: { enhanceStrength: 'strong', flatColors: true, cartoonStyle: false, customPrompt: '' },
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
  transformedPixels: editor.pixels,
  stats: editor.stats,
  isProcessing: false,
  gridWidthActual: 52,
  gridHeightActual: 52,
  topTrim: 0,
  bottomTrim: 0,
  leftTrim: 0,
  rightTrim: 0,
  mobileTab: 'canvas' as const,
  pipelineMode: 'process' as PipelineMode,
  currentProjectId: null,
  undoStack: editor.undoStack,
  redoStack: editor.redoStack,

  setIsAiEnhancing: (v) => set({ isAiEnhancing: v }),
  setAiEnhanceError: (v) => set({ aiEnhanceError: v }),
  setAiEnhancedImage: (v) => set({ aiEnhancedImage: v }),
  setAiEnhanceOptions: (v) => set({ aiEnhanceOptions: { ...get().aiEnhanceOptions, ...v } }),
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
  setPipelineResult: (pixels, stats) => { editor.load(pixels, stats); set(syncEditor()); },
  setTransformedPixels: (v) => { editor.load(v); set(syncEditor()); },
  setStats: (v) => set({ stats: v }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  setGridWidthActual: (v) => set({ gridWidthActual: v }),
  setGridHeightActual: (v) => set({ gridHeightActual: v }),
  setTopTrim: (v) => set({ topTrim: v }),
  setBottomTrim: (v) => set({ bottomTrim: v }),
  setLeftTrim: (v) => set({ leftTrim: v }),
  setRightTrim: (v) => set({ rightTrim: v }),
  setMobileTab: (v) => set({ mobileTab: v }),
  setPipelineMode: (v) => set({ pipelineMode: v }),

  pushUndo: () => {
    editor.pushUndo();
    set(syncEditor());
  },

  applyBrush: (x, y, gridWidth) => {
    const s = get();
    const targetBead = s.isEraser ? EMPTY_BEAD : s.brushBead;
    if (!targetBead) return;
    editor.brush(x, y, gridWidth, targetBead);
    set({ ...syncEditor(), selectedCell: { x, y } });
  },

  applyWandFill: (cell, selection, targetBead, gridWidth) => {
    editor.wandFill(selection, targetBead, gridWidth);
    set({ ...syncEditor(), wandSelection: new Set(), selectedCell: cell });
  },

  undo: () => {
    if (editor.undoStack.length === 0) return;
    editor.undo();
    set({ ...syncEditor(), wandSelection: new Set(), selectedCell: null });
  },

  redo: () => {
    if (editor.redoStack.length === 0) return;
    editor.redo();
    set({ ...syncEditor(), wandSelection: new Set(), selectedCell: null });
  },

  denoise: (gridWidth, gridHeight, palette) => {
    const changed = editor.denoise(gridWidth, gridHeight, palette);
    if (changed > 0) set(syncEditor());
  },

  swapColor: (sourceCode, targetBead) => {
    editor.swapColor(sourceCode, targetBead);
    set(syncEditor());
  },

  autoDetectTrim: (gridWidth, gridHeight) => {
    const bounds = editor.detectBounds(gridWidth, gridHeight);
    if (!bounds) return;
    set({ topTrim: bounds.top, bottomTrim: gridHeight - 1 - bounds.bottom, leftTrim: bounds.left, rightTrim: gridWidth - 1 - bounds.right });
  },
  applyTrim: (gridWidth, gridHeight) => {
    const { topTrim, bottomTrim, leftTrim, rightTrim } = get();
    const result = editor.trim(topTrim, bottomTrim, leftTrim, rightTrim, gridWidth, gridHeight);
    if (!result) return;
    set({
      ...syncEditor(),
      gridWidthActual: result.width,
      gridHeightActual: result.height,
      topTrim: 0, bottomTrim: 0, leftTrim: 0, rightTrim: 0,
    });
  },

  loadProject: (pixels, gridWidth, gridHeight, stats, settings, hasOriginalImage, projectId) => {
    const preset = (settings.panelPreset as WorkspaceStore['panelPreset']) || 'custom';
    editor.load(pixels, stats);
    set({
      ...syncEditor(),
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
      pipelineMode: hasOriginalImage === true ? 'skipOnce' : 'skipAndHold',
      currentProjectId: projectId ?? null,
    });
  },
}));
