import { TransformedPixel, IngredientStat } from '../types';
import { BEAD_PALETTE } from '../data/palette';
import { EMPTY_BEAD } from './editOperations';

const INDEX_KEY = 'pixel_projects_index';
const PROJECT_PREFIX = 'pixel_project_';

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  thumbnail: string;
  gridWidth: number;
  gridHeight: number;
  colorCount: number;
}

export interface ProjectData {
  meta: ProjectMeta;
  pixelCodes: string[];
  stats: IngredientStat[];
  settings: {
    colorLimit: number;
    distanceAlgorithm: string;
    removeBackground: boolean;
    brightness: number;
    contrast: number;
    saturation: number;
    panelPreset?: string;
    customWidth?: number;
  };
  originalImage?: string;
  aspectRatio?: string;
}

function getIndex(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIndex(index: ProjectMeta[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function packPixels(pixels: TransformedPixel[]): string[] {
  return pixels.map(p => p.matchedBead.code);
}

function codeToPixels(codes: string[], gridWidth: number, gridHeight: number): TransformedPixel[] {
  const palette = BEAD_PALETTE.filter(b => b.brand === 'MGB');
  const map = new Map(palette.map(b => [b.code, b]));
  return codes.map((code, i) => ({
    x: i % gridWidth,
    y: Math.floor(i / gridWidth),
    matchedBead: map.get(code) || { ...EMPTY_BEAD },
  }));
}

function objToPixels(pixels: TransformedPixel[], gridWidth: number, gridHeight: number): TransformedPixel[] {
  return pixels.map((p, i) => ({
    x: i % gridWidth,
    y: Math.floor(i / gridWidth),
    matchedBead: p.matchedBead || { ...EMPTY_BEAD },
  }));
}

function generateThumbnail(codes: string[], gridWidth: number, gridHeight: number): string {
  const thumbSize = 160;
  const cellSize = Math.max(1, Math.floor(thumbSize / Math.max(gridWidth, gridHeight)));
  const canvas = document.createElement('canvas');
  canvas.width = gridWidth * cellSize;
  canvas.height = gridHeight * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const palette = BEAD_PALETTE.filter(b => b.brand === 'MGB');
  const hexMap = new Map(palette.map(b => [b.code, b.hex]));
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const code = codes[y * gridWidth + x];
      const hex = code !== 'EMPTY' ? hexMap.get(code) : null;
      ctx.fillStyle = hex || '#ffffff';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
  return canvas.toDataURL('image/png', 0.5);
}

export function saveProject(
  name: string,
  pixels: TransformedPixel[],
  gridWidth: number,
  gridHeight: number,
  stats: IngredientStat[],
  settings: ProjectData['settings'],
  originalImage?: string,
  aspectRatio?: string,
): ProjectMeta {
  const id = generateId();
  const now = new Date().toLocaleString('zh-CN');
  const pixelCodes = packPixels(pixels);
  const thumbnail = generateThumbnail(pixelCodes, gridWidth, gridHeight);
  const meta: ProjectMeta = { id, name, createdAt: now, thumbnail, gridWidth, gridHeight, colorCount: stats.length };
  const data: ProjectData = { meta, pixelCodes, stats, settings, originalImage, aspectRatio };
  try {
    localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(data));
  } catch {
    localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify({ ...data, originalImage: undefined }));
  }
  const index = getIndex();
  index.unshift(meta);
  if (index.length > 50) index.length = 50;
  saveIndex(index);
  return meta;
}

export function updateProject(
  id: string,
  pixels: TransformedPixel[],
  gridWidth: number,
  gridHeight: number,
  stats: IngredientStat[],
  settings: ProjectData['settings'],
  originalImage?: string,
  aspectRatio?: string,
): ProjectMeta | null {
  const raw = localStorage.getItem(PROJECT_PREFIX + id);
  if (!raw) return null;
  try {
    const old = JSON.parse(raw);
    const pixelCodes = packPixels(pixels);
    const thumbnail = generateThumbnail(pixelCodes, gridWidth, gridHeight);
    const meta: ProjectMeta = { id, name: old.meta.name, createdAt: old.meta.createdAt, thumbnail, gridWidth, gridHeight, colorCount: stats.length };
    const data: ProjectData = { meta, pixelCodes, stats, settings, originalImage, aspectRatio };
    try {
      localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(data));
    } catch {
      localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify({ ...data, originalImage: undefined }));
    }
    const index = getIndex().map(m => m.id === id ? meta : m);
    saveIndex(index);
    return meta;
  } catch {
    return null;
  }
}

export function deleteProject(id: string): void {
  localStorage.removeItem(PROJECT_PREFIX + id);
  saveIndex(getIndex().filter(m => m.id !== id));
}

export function renameProject(id: string, newName: string): void {
  const raw = localStorage.getItem(PROJECT_PREFIX + id);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    data.meta.name = newName;
    localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(data));
    const index = getIndex().map(m => m.id === id ? { ...m, name: newName } : m);
    saveIndex(index);
  } catch { /* ignore */ }
}

export function loadProjectData(id: string): { pixels: TransformedPixel[]; meta: ProjectMeta; stats: IngredientStat[]; settings: ProjectData['settings']; originalImage?: string; aspectRatio?: string } | null {
  try {
    const raw = localStorage.getItem(PROJECT_PREFIX + id);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const { meta, stats, settings, originalImage, aspectRatio } = data;
    const gridWidth = meta.gridWidth;
    const gridHeight = meta.gridHeight;
    let pixels: TransformedPixel[];
    if (data.pixelCodes && Array.isArray(data.pixelCodes) && typeof data.pixelCodes[0] === 'string') {
      pixels = codeToPixels(data.pixelCodes, gridWidth, gridHeight);
    } else if (data.pixels && Array.isArray(data.pixels)) {
      pixels = objToPixels(data.pixels, gridWidth, gridHeight);
    } else {
      return null;
    }
    return { pixels, meta, stats, settings, originalImage, aspectRatio };
  } catch {
    return null;
  }
}

export function getAllProjects(): ProjectMeta[] {
  return getIndex();
}

export function exportProjectAsJson(
  name: string,
  pixels: TransformedPixel[],
  gridWidth: number,
  gridHeight: number,
  stats: IngredientStat[],
  settings: ProjectData['settings'],
  originalImage?: string,
  aspectRatio?: string,
): void {
  const data = {
    name,
    exportedAt: new Date().toLocaleString('zh-CN'),
    pixelCodes: packPixels(pixels),
    stats,
    gridWidth,
    gridHeight,
    settings,
    originalImage,
    aspectRatio,
    version: 3,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importProjectFromJson(file: File): Promise<{ name: string; pixels: TransformedPixel[]; gridWidth: number; gridHeight: number; stats: IngredientStat[]; settings: ProjectData['settings']; originalImage?: string; aspectRatio?: string } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.gridWidth || !data.gridHeight) { resolve(null); return; }
        const { gridWidth, gridHeight, stats, settings, originalImage, aspectRatio } = data;
        let pixels: TransformedPixel[];
        if (data.pixelCodes && Array.isArray(data.pixelCodes) && typeof data.pixelCodes[0] === 'string') {
          pixels = codeToPixels(data.pixelCodes, gridWidth, gridHeight);
        } else if (data.pixels && Array.isArray(data.pixels)) {
          pixels = objToPixels(data.pixels, gridWidth, gridHeight);
        } else {
          resolve(null);
          return;
        }
        resolve({
          name: data.name || '导入的项目',
          pixels,
          gridWidth,
          gridHeight,
          stats: stats || [],
          settings: settings || { colorLimit: 12, distanceAlgorithm: 'CIEDE2000', removeBackground: true, brightness: 100, contrast: 100, saturation: 100, panelPreset: 'custom', customWidth: data.gridWidth },
          originalImage,
          aspectRatio,
        });
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
