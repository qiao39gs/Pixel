import { create } from 'zustand';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../types';
import { EMPTY_BEAD } from '../utils/editOperations';
import { PatternEditor, Snapshot } from '../utils/patternEditor';

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
  hoverBeadHighlight: string | null;
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
  panelOpen: 'left' | 'right' | 'both' | 'none';
  leftDrawerTab: 'spec' | 'adjust' | 'ai' | 'trim' | 'view';
  mobileToolbarOpen: boolean;
  projectPanelOpen: boolean;
  dragMode: boolean;
  pipelineMode: PipelineMode;
  currentProjectId: string | null;
  currentProjectName: string | null;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: string | null;
  hasManualEdits: boolean;
  undoStack: Snapshot[];
  redoStack: Snapshot[];

  // Simple setters
  setIsAiEnhancing: (v: boolean) => void;
  setAiEnhanceError: (v: string | null) => void;
  setAiEnhancedImage: (v: string | null) => void;
  setAiEnhanceOptions: (v: Partial<AiEnhanceOptions>) => void;
  setPanelPreset: (v: WorkspaceStore['panelPreset']) => boolean;
  setCustomWidth: (v: number) => boolean;
  setLocalAspectRatio: (v: number) => void;
  setColorLimit: (v: number) => boolean;
  setBrightness: (v: number) => boolean;
  setContrast: (v: number) => boolean;
  setSaturation: (v: number) => boolean;
  setDistanceAlgorithm: (v: WorkspaceStore['distanceAlgorithm']) => boolean;
  setKMedoidsOptimize: (v: boolean) => boolean;
  setRemoveBackground: (v: boolean) => boolean;
  setScale: (v: number) => void;
  setShowNumbers: (v: boolean) => void;
  setShowRulers: (v: boolean) => void;
  setSelectedBeadHighlight: (v: string | null) => void;
  setHoverBeadHighlight: (v: string | null) => void;
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
  /** 加载管线输出。清空 undo/redo 栈 — 管线结果是新基线，不可撤销。 */
  setPipelineResult: (pixels: TransformedPixel[], stats: IngredientStat[], width?: number, height?: number) => void;
  setIsProcessing: (v: boolean) => void;
  setGridWidthActual: (v: number) => void;
  setGridHeightActual: (v: number) => void;
  setPanelOpen: (v: WorkspaceStore['panelOpen']) => void;
  setLeftDrawerTab: (v: WorkspaceStore['leftDrawerTab']) => void;
  setMobileToolbarOpen: (v: boolean) => void;
  collapsedGroups: Set<string>;
  toggleGroupCollapse: (series: string) => void;
  setProjectPanelOpen: (v: boolean) => void;
  toggleProjectPanel: () => void;
  setDragMode: (v: boolean) => void;
  toggleLeftDrawer: () => void;
  toasts: { id: number; msg: string }[];
  pushToast: (msg: string) => void;
  toggleRightPanel: () => void;
  setPipelineMode: (v: PipelineMode) => void;
  markDirty: () => void;
  markSaved: (id: string, name: string) => void;
  setSaveStatus: (v: WorkspaceStore['saveStatus']) => void;
  clearCurrentProject: () => void;

  // Complex actions
  pushUndo: () => void;
  beginBrushStroke: () => void;
  endBrushStroke: () => void;
  applyBrush: (x: number, y: number, gridWidth: number) => void;
  applyWandFill: (cell: { x: number; y: number }, selection: Set<string>, targetBead: BeadPaletteItem, gridWidth: number) => void;
  undo: () => void;
  redo: () => void;
  denoise: (gridWidth: number, gridHeight: number, palette: BeadPaletteItem[]) => void;
  swapColor: (sourceCode: string, targetBead: BeadPaletteItem) => void;
  createBlankProject: (gridWidth: number, gridHeight: number) => void;
  loadProject: (pixels: TransformedPixel[], gridWidth: number, gridHeight: number, stats: IngredientStat[], settings: { colorLimit: number; distanceAlgorithm: string; removeBackground: boolean; brightness: number; contrast: number; saturation: number; panelPreset?: string; customWidth?: number; kMedoidsOptimize?: boolean }, hasOriginalImage?: boolean, projectId?: string, projectName?: string) => void;
  autoDetectTrim: (gridWidth: number, gridHeight: number) => void;
  setTopTrim: (v: number) => void;
  setBottomTrim: (v: number) => void;
  setLeftTrim: (v: number) => void;
  setRightTrim: (v: number) => void;
  applyTrim: (gridWidth: number, gridHeight: number) => void;
}

const editor = new PatternEditor();

/** 单向快照：Editor → Store。Store 永远不回写 Editor。 */
const snapshotEditor = () => ({
  transformedPixels: editor.pixels,
  stats: editor.stats,
  gridWidthActual: editor.width,
  gridHeightActual: editor.height,
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
  kMedoidsOptimize: true,
  removeBackground: true,
  scale: 14,
  showNumbers: true,
  showRulers: true,
  selectedBeadHighlight: null,
  hoverBeadHighlight: null,
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
  panelOpen: 'right' as const,
  leftDrawerTab: 'spec' as const,
  mobileToolbarOpen: false,
  collapsedGroups: new Set<string>(),
  projectPanelOpen: false,
  dragMode: false,
  toasts: [],
  pipelineMode: 'process' as PipelineMode,
  currentProjectId: null,
  currentProjectName: null,
  isDirty: false,
  saveStatus: 'idle',
  lastSavedAt: null,
  hasManualEdits: false,
  undoStack: editor.undoStack,
  redoStack: editor.redoStack,

  setIsAiEnhancing: (v) => set({ isAiEnhancing: v }),
  setAiEnhanceError: (v) => set({ aiEnhanceError: v }),
  setAiEnhancedImage: (v) => set({ aiEnhancedImage: v }),
  setAiEnhanceOptions: (v) => set({ aiEnhanceOptions: { ...get().aiEnhanceOptions, ...v } }),
  setPanelPreset: (v) => { if (get().hasManualEdits && !window.confirm('修改图纸规格将重新生成图纸并覆盖当前手工编辑，是否继续？')) return false; set({ panelPreset: v, isDirty: true, saveStatus: 'idle', hasManualEdits: false }); return true; },
  setCustomWidth: (v) => { if (get().hasManualEdits && !window.confirm('修改图纸规格将重新生成图纸并覆盖当前手工编辑，是否继续？')) return false; set({ customWidth: v, isDirty: true, saveStatus: 'idle', hasManualEdits: false }); return true; },
  setLocalAspectRatio: (v) => set({ localAspectRatio: v }),
  setColorLimit: (v) => { if (get().hasManualEdits && !window.confirm('修改颜色数量将重新生成图纸并覆盖当前手工编辑，是否继续？')) return false; set({ colorLimit: v, isDirty: true, saveStatus: 'idle', hasManualEdits: false }); return true; },
  setBrightness: (v) => { if (get().hasManualEdits && !window.confirm('调整图像将重新生成图纸并覆盖当前手工编辑，是否继续？')) return false; set({ brightness: v, isDirty: true, saveStatus: 'idle', hasManualEdits: false }); return true; },
  setContrast: (v) => { if (get().hasManualEdits && !window.confirm('调整图像将重新生成图纸并覆盖当前手工编辑，是否继续？')) return false; set({ contrast: v, isDirty: true, saveStatus: 'idle', hasManualEdits: false }); return true; },
  setSaturation: (v) => { if (get().hasManualEdits && !window.confirm('调整图像将重新生成图纸并覆盖当前手工编辑，是否继续？')) return false; set({ saturation: v, isDirty: true, saveStatus: 'idle', hasManualEdits: false }); return true; },
  setDistanceAlgorithm: (v) => { if (get().hasManualEdits && !window.confirm('修改颜色匹配方式将重新生成图纸并覆盖当前手工编辑，是否继续？')) return false; set({ distanceAlgorithm: v, isDirty: true, saveStatus: 'idle', hasManualEdits: false }); return true; },
  setKMedoidsOptimize: (v) => { if (get().hasManualEdits && !window.confirm('修改选色方式将重新生成图纸并覆盖当前手工编辑，是否继续？')) return false; set({ kMedoidsOptimize: v, isDirty: true, saveStatus: 'idle', hasManualEdits: false }); return true; },
  setRemoveBackground: (v) => { if (get().hasManualEdits && !window.confirm('修改背景过滤将重新生成图纸并覆盖当前手工编辑，是否继续？')) return false; set({ removeBackground: v, isDirty: true, saveStatus: 'idle', hasManualEdits: false }); return true; },
  setScale: (v) => set({ scale: v }),
  setShowNumbers: (v) => set({ showNumbers: v }),
  setShowRulers: (v) => set({ showRulers: v }),
  setSelectedBeadHighlight: (v) => set({ selectedBeadHighlight: v }),
  setHoverBeadHighlight: (v) => set({ hoverBeadHighlight: v }),
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
  setPipelineResult: (pixels, stats, width = 0, height = 0) => { editor.load(pixels, stats, width, height); set({ ...snapshotEditor(), isDirty: pixels.length > 0, saveStatus: 'idle', hasManualEdits: false }); },
  setIsProcessing: (v) => set({ isProcessing: v }),
  setGridWidthActual: (v) => set({ gridWidthActual: v }),
  setGridHeightActual: (v) => set({ gridHeightActual: v }),
  setTopTrim: (v) => set({ topTrim: v }),
  setBottomTrim: (v) => set({ bottomTrim: v }),
  setLeftTrim: (v) => set({ leftTrim: v }),
  setRightTrim: (v) => set({ rightTrim: v }),
  setPanelOpen: (v) => set({ panelOpen: v }),
  setLeftDrawerTab: (v) => set({ leftDrawerTab: v }),
  setMobileToolbarOpen: (v) => set({ mobileToolbarOpen: v }),
  toggleGroupCollapse: (series) => set((s) => {
    const next = new Set(s.collapsedGroups);
    if (next.has(series)) next.delete(series); else next.add(series);
    return { collapsedGroups: next };
  }),
  setProjectPanelOpen: (v) => set({ projectPanelOpen: v }),
  toggleProjectPanel: () => set((s) => ({ projectPanelOpen: !s.projectPanelOpen })),
  setDragMode: (v) => set({ dragMode: v }),
  pushToast: (msg) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, msg }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2200);
  },
  toggleLeftDrawer: () => set((s) => {
    const leftOpen = s.panelOpen === 'left' || s.panelOpen === 'both';
    if (leftOpen) return { panelOpen: s.panelOpen === 'both' ? 'right' : 'none' };
    return { panelOpen: s.panelOpen === 'right' ? 'both' : 'left' };
  }),
  toggleRightPanel: () => set((s) => {
    const rightOpen = s.panelOpen === 'right' || s.panelOpen === 'both';
    if (rightOpen) return { panelOpen: s.panelOpen === 'both' ? 'left' : 'none' };
    return { panelOpen: s.panelOpen === 'left' ? 'both' : 'right' };
  }),
  setPipelineMode: (v) => set({ pipelineMode: v }),
  markDirty: () => set({ isDirty: true, saveStatus: 'idle' }),
  markSaved: (id, name) => set({ currentProjectId: id, currentProjectName: name, isDirty: false, saveStatus: 'saved', lastSavedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }),
  setSaveStatus: (v) => set({ saveStatus: v }),
  clearCurrentProject: () => set({ currentProjectId: null, currentProjectName: null, isDirty: false, saveStatus: 'idle', lastSavedAt: null, hasManualEdits: false }),

  pushUndo: () => {
    editor.pushUndo();
    set(snapshotEditor());
  },

  beginBrushStroke: () => editor.beginStroke(),
  endBrushStroke: () => editor.endStroke(),

  applyBrush: (x, y, gridWidth) => {
    const s = get();
    const targetBead = s.isEraser ? EMPTY_BEAD : s.brushBead;
    if (!targetBead) return;
    editor.brush(x, y, gridWidth, targetBead);
    set({ ...snapshotEditor(), selectedCell: { x, y }, isDirty: true, saveStatus: 'idle', hasManualEdits: true });
  },

  applyWandFill: (cell, selection, targetBead, gridWidth) => {
    editor.wandFill(selection, targetBead, gridWidth);
    set({ ...snapshotEditor(), wandSelection: new Set(), selectedCell: cell, isDirty: true, saveStatus: 'idle', hasManualEdits: true });
  },

  undo: () => {
    if (editor.undoStack.length === 0) return;
    editor.undo();
    set({ ...snapshotEditor(), wandSelection: new Set(), selectedCell: null, isDirty: true, saveStatus: 'idle', hasManualEdits: true });
    get().pushToast('已撤销');
  },

  redo: () => {
    if (editor.redoStack.length === 0) return;
    editor.redo();
    set({ ...snapshotEditor(), wandSelection: new Set(), selectedCell: null, isDirty: true, saveStatus: 'idle', hasManualEdits: true });
    get().pushToast('已重做');
  },

  denoise: (gridWidth, gridHeight, palette) => {
    const changed = editor.denoise(gridWidth, gridHeight, palette);
    if (changed > 0) { set({ ...snapshotEditor(), isDirty: true, saveStatus: 'idle', hasManualEdits: true }); get().pushToast(`已去杂色 ${changed} 格`); }
    else get().pushToast('无杂色可清理');
  },

  swapColor: (sourceCode, targetBead) => {
    editor.swapColor(sourceCode, targetBead);
    set({ ...snapshotEditor(), isDirty: true, saveStatus: 'idle', hasManualEdits: true });
  },

  createBlankProject: (gridWidth, gridHeight) => {
    const pixels = Array.from({ length: gridWidth * gridHeight }, (_, index) => ({
      x: index % gridWidth,
      y: Math.floor(index / gridWidth),
      matchedBead: { ...EMPTY_BEAD },
    }));
    editor.load(pixels, [], gridWidth, gridHeight);
    set({
      ...snapshotEditor(),
      panelPreset: 'custom',
      customWidth: gridWidth,
      localAspectRatio: gridWidth / gridHeight,
      pipelineMode: 'skipAndHold',
      currentProjectId: null,
      currentProjectName: '未命名空白图纸',
      isDirty: true,
      saveStatus: 'idle',
      lastSavedAt: null,
      hasManualEdits: false,
      wandSelection: new Set(),
      selectedCell: null,
      editMode: true,
      brushBead: null,
      isEraser: false,
      wandMode: false,
      panOffset: { x: 0, y: 0 },
      topTrim: 0,
      bottomTrim: 0,
      leftTrim: 0,
      rightTrim: 0,
    });
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
      ...snapshotEditor(),
      gridWidthActual: result.width,
      gridHeightActual: result.height,
      topTrim: 0, bottomTrim: 0, leftTrim: 0, rightTrim: 0,
      isDirty: true,
      saveStatus: 'idle',
      hasManualEdits: true,
    });
    get().pushToast('已应用裁剪');
  },

  loadProject: (pixels, gridWidth, gridHeight, stats, settings, hasOriginalImage, projectId, projectName) => {
    const preset = (settings.panelPreset as WorkspaceStore['panelPreset']) || 'custom';
    editor.load(pixels, stats, gridWidth, gridHeight);
    set({
      ...snapshotEditor(),
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
      currentProjectName: projectName ?? null,
      isDirty: false,
      saveStatus: 'saved',
      lastSavedAt: null,
      hasManualEdits: false,
    });
  },
}));
