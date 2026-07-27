import { TransformedPixel, IngredientStat } from '../types';
import { BEAD_PALETTE } from '../data/palette';
import { EMPTY_BEAD } from './editOperations';
import { recalculateStats } from './statsUtils';
import { AspectRatio } from './constants';

const DB_NAME = 'pixel-bead-workspace';
const DB_VERSION = 1;
const PROJECT_STORE = 'projects';
const DRAFT_STORE = 'drafts';
const DRAFT_ID = 'current';
const LEGACY_INDEX_KEY = 'pixel_projects_index';
const LEGACY_PROJECT_PREFIX = 'pixel_project_';

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  updatedAtMs: number;
  thumbnail: string;
  gridWidth: number;
  gridHeight: number;
  colorCount: number;
  hasOriginalImage: boolean;
}

export interface ProjectSettings {
  colorLimit: number;
  distanceAlgorithm: string;
  removeBackground: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  panelPreset?: string;
  customWidth?: number;
  kMedoidsOptimize?: boolean;
}

export interface ProjectData {
  meta: ProjectMeta;
  pixelCodes: string[];
  stats: IngredientStat[];
  settings: ProjectSettings;
  originalImageBlob?: Blob;
  aspectRatio?: AspectRatio;
}

export interface LoadedProject {
  pixels: TransformedPixel[];
  meta: ProjectMeta;
  stats: IngredientStat[];
  settings: ProjectSettings;
  originalImage?: string;
  aspectRatio?: AspectRatio;
}

export interface DraftData extends LoadedProject {
  currentProjectId: string | null;
  currentProjectName: string | null;
  savedAt: string;
}

interface DraftRecord extends ProjectData {
  id: string;
  currentProjectId: string | null;
  currentProjectName: string | null;
  savedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let migrationPromise: Promise<void> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) db.createObjectStore(PROJECT_STORE, { keyPath: 'meta.id' });
      if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开项目数据库'));
  });
  return dbPromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('项目数据库操作失败'));
  });
}

async function runTransaction<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  return requestResult(operation(tx.objectStore(storeName)));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function packPixels(pixels: TransformedPixel[]): string[] {
  return pixels.map(p => p.matchedBead.code);
}

function codeToPixels(codes: string[], gridWidth: number, gridHeight: number): TransformedPixel[] {
  const map = new Map(BEAD_PALETTE.filter(b => b.brand === 'MGB').map(b => [b.code, b]));
  const length = gridWidth * gridHeight;
  return Array.from({ length }, (_, i) => ({
    x: i % gridWidth,
    y: Math.floor(i / gridWidth),
    matchedBead: map.get(codes[i]) || { ...EMPTY_BEAD },
  }));
}

function objToPixels(pixels: TransformedPixel[], gridWidth: number, gridHeight: number): TransformedPixel[] {
  return Array.from({ length: gridWidth * gridHeight }, (_, i) => ({
    x: i % gridWidth,
    y: Math.floor(i / gridWidth),
    matchedBead: pixels[i]?.matchedBead || { ...EMPTY_BEAD },
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
  const hexMap = new Map(BEAD_PALETTE.filter(b => b.brand === 'MGB').map(b => [b.code, b.hex]));
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const code = codes[y * gridWidth + x];
      ctx.fillStyle = code !== 'EMPTY' ? hexMap.get(code) || '#ffffff' : '#ffffff';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
  return canvas.toDataURL('image/png', 0.5);
}

async function dataUrlToBlob(dataUrl?: string): Promise<Blob | undefined> {
  if (!dataUrl) return undefined;
  const response = await fetch(dataUrl);
  return response.blob();
}

function blobToDataUrl(blob?: Blob): Promise<string | undefined> {
  if (!blob) return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('无法读取项目原图'));
    reader.readAsDataURL(blob);
  });
}

function normalizeAspectRatio(value?: string): AspectRatio {
  return value === '1:1' || value === '4:3' || value === '3:4' || value === '16:9' || value === '9:16' ? value : 'auto';
}

function isSafeDimension(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 300;
}

async function migrateLegacyProjects(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    const rawIndex = localStorage.getItem(LEGACY_INDEX_KEY);
    if (!rawIndex) return;
    let legacyIndex: Array<{ id: string }>;
    try { legacyIndex = JSON.parse(rawIndex); } catch { return; }

    const failedItems: Array<{ id: string }> = [];
    for (const item of legacyIndex) {
      const raw = localStorage.getItem(LEGACY_PROJECT_PREFIX + item.id);
      if (!raw) continue;
      try {
        const legacy = JSON.parse(raw);
        const meta = legacy.meta;
        if (!meta || !isSafeDimension(meta.gridWidth) || !isSafeDimension(meta.gridHeight)) { failedItems.push(item); continue; }
        const pixelCodes = Array.isArray(legacy.pixelCodes)
          ? legacy.pixelCodes
          : Array.isArray(legacy.pixels) ? legacy.pixels.map((p: TransformedPixel) => p?.matchedBead?.code || 'EMPTY') : null;
        if (!pixelCodes) { failedItems.push(item); continue; }
        const originalImageBlob = await dataUrlToBlob(legacy.originalImage);
        const now = meta.createdAt || new Date().toLocaleString('zh-CN');
        const record: ProjectData = {
          meta: { ...meta, updatedAt: meta.updatedAt || now, updatedAtMs: meta.updatedAtMs || Date.now(), hasOriginalImage: !!originalImageBlob },
          pixelCodes,
          stats: Array.isArray(legacy.stats) ? legacy.stats : recalculateStats(codeToPixels(pixelCodes, meta.gridWidth, meta.gridHeight)),
          settings: legacy.settings,
          originalImageBlob,
          aspectRatio: normalizeAspectRatio(legacy.aspectRatio),
        };
        await runTransaction(PROJECT_STORE, 'readwrite', store => store.put(record));
        localStorage.removeItem(LEGACY_PROJECT_PREFIX + item.id);
      } catch { failedItems.push(item); }
    }
    if (failedItems.length > 0) localStorage.setItem(LEGACY_INDEX_KEY, JSON.stringify(failedItems));
    else localStorage.removeItem(LEGACY_INDEX_KEY);
  })();
  return migrationPromise;
}

function makeRecord(
  id: string,
  name: string,
  createdAt: string,
  pixels: TransformedPixel[],
  gridWidth: number,
  gridHeight: number,
  stats: IngredientStat[],
  settings: ProjectSettings,
  originalImageBlob: Blob | undefined,
  aspectRatio: AspectRatio,
): ProjectData {
  const updatedAt = new Date().toLocaleString('zh-CN');
  const pixelCodes = packPixels(pixels);
  return {
    meta: { id, name, createdAt, updatedAt, updatedAtMs: Date.now(), thumbnail: generateThumbnail(pixelCodes, gridWidth, gridHeight), gridWidth, gridHeight, colorCount: stats.length, hasOriginalImage: !!originalImageBlob },
    pixelCodes,
    stats,
    settings,
    originalImageBlob,
    aspectRatio,
  };
}

export async function saveProject(
  name: string, pixels: TransformedPixel[], gridWidth: number, gridHeight: number,
  stats: IngredientStat[], settings: ProjectSettings, originalImage?: string, aspectRatio: AspectRatio = 'auto',
): Promise<ProjectMeta> {
  await migrateLegacyProjects();
  const now = new Date().toLocaleString('zh-CN');
  const record = makeRecord(generateId(), name, now, pixels, gridWidth, gridHeight, stats, settings, await dataUrlToBlob(originalImage), aspectRatio);
  await runTransaction(PROJECT_STORE, 'readwrite', store => store.add(record));
  return record.meta;
}

export async function updateProject(
  id: string, pixels: TransformedPixel[], gridWidth: number, gridHeight: number,
  stats: IngredientStat[], settings: ProjectSettings, originalImage?: string, aspectRatio: AspectRatio = 'auto',
): Promise<ProjectMeta | null> {
  await migrateLegacyProjects();
  const old = await runTransaction<ProjectData | undefined>(PROJECT_STORE, 'readonly', store => store.get(id));
  if (!old) return null;
  const originalImageBlob = originalImage ? await dataUrlToBlob(originalImage) : old.originalImageBlob;
  const record = makeRecord(id, old.meta.name, old.meta.createdAt, pixels, gridWidth, gridHeight, stats, settings, originalImageBlob, aspectRatio);
  await runTransaction(PROJECT_STORE, 'readwrite', store => store.put(record));
  return record.meta;
}

export async function deleteProject(id: string): Promise<void> {
  await migrateLegacyProjects();
  await runTransaction(PROJECT_STORE, 'readwrite', store => store.delete(id));
}

export async function renameProject(id: string, newName: string): Promise<ProjectMeta | null> {
  await migrateLegacyProjects();
  const data = await runTransaction<ProjectData | undefined>(PROJECT_STORE, 'readonly', store => store.get(id));
  if (!data) return null;
  data.meta = { ...data.meta, name: newName, updatedAt: new Date().toLocaleString('zh-CN') };
  await runTransaction(PROJECT_STORE, 'readwrite', store => store.put(data));
  return data.meta;
}

export async function loadProjectData(id: string): Promise<LoadedProject | null> {
  await migrateLegacyProjects();
  const data = await runTransaction<ProjectData | undefined>(PROJECT_STORE, 'readonly', store => store.get(id));
  if (!data) return null;
  const pixels = codeToPixels(data.pixelCodes, data.meta.gridWidth, data.meta.gridHeight);
  return {
    pixels,
    meta: data.meta,
    stats: recalculateStats(pixels),
    settings: data.settings,
    originalImage: await blobToDataUrl(data.originalImageBlob),
    aspectRatio: normalizeAspectRatio(data.aspectRatio),
  };
}

export async function getAllProjects(): Promise<ProjectMeta[]> {
  await migrateLegacyProjects();
  const records = await runTransaction<ProjectData[]>(PROJECT_STORE, 'readonly', store => store.getAll());
  return records.map(record => record.meta).sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
}

export async function saveDraft(
  pixels: TransformedPixel[], gridWidth: number, gridHeight: number, stats: IngredientStat[], settings: ProjectSettings,
  originalImage: string | undefined, aspectRatio: AspectRatio, currentProjectId: string | null, currentProjectName: string | null,
): Promise<void> {
  const now = new Date().toLocaleString('zh-CN');
  const record = makeRecord(DRAFT_ID, currentProjectName || '自动恢复草稿', now, pixels, gridWidth, gridHeight, stats, settings, await dataUrlToBlob(originalImage), aspectRatio) as DraftRecord;
  record.id = DRAFT_ID;
  record.currentProjectId = currentProjectId;
  record.currentProjectName = currentProjectName;
  record.savedAt = now;
  await runTransaction(DRAFT_STORE, 'readwrite', store => store.put(record));
}

export async function loadDraft(): Promise<DraftData | null> {
  const data = await runTransaction<DraftRecord | undefined>(DRAFT_STORE, 'readonly', store => store.get(DRAFT_ID));
  if (!data) return null;
  const pixels = codeToPixels(data.pixelCodes, data.meta.gridWidth, data.meta.gridHeight);
  return {
    pixels,
    meta: data.meta,
    stats: recalculateStats(pixels),
    settings: data.settings,
    originalImage: await blobToDataUrl(data.originalImageBlob),
    aspectRatio: normalizeAspectRatio(data.aspectRatio),
    currentProjectId: data.currentProjectId,
    currentProjectName: data.currentProjectName,
    savedAt: data.savedAt,
  };
}

export async function clearDraft(): Promise<void> {
  await runTransaction(DRAFT_STORE, 'readwrite', store => store.delete(DRAFT_ID));
}

export function exportProjectAsJson(
  name: string, pixels: TransformedPixel[], gridWidth: number, gridHeight: number,
  stats: IngredientStat[], settings: ProjectSettings, originalImage?: string, aspectRatio?: AspectRatio,
): void {
  const data = { name, exportedAt: new Date().toLocaleString('zh-CN'), pixelCodes: packPixels(pixels), stats, gridWidth, gridHeight, settings, originalImage, aspectRatio, version: 4 };
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

export function importProjectFromJson(file: File): Promise<{ name: string; pixels: TransformedPixel[]; gridWidth: number; gridHeight: number; stats: IngredientStat[]; settings: ProjectSettings; originalImage?: string; aspectRatio?: AspectRatio } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!isSafeDimension(data.gridWidth) || !isSafeDimension(data.gridHeight)) { resolve(null); return; }
        const expectedLength = data.gridWidth * data.gridHeight;
        let pixels: TransformedPixel[];
        if (Array.isArray(data.pixelCodes) && data.pixelCodes.length === expectedLength) pixels = codeToPixels(data.pixelCodes, data.gridWidth, data.gridHeight);
        else if (Array.isArray(data.pixels) && data.pixels.length === expectedLength) pixels = objToPixels(data.pixels, data.gridWidth, data.gridHeight);
        else { resolve(null); return; }
        resolve({
          name: data.name || '导入的项目', pixels, gridWidth: data.gridWidth, gridHeight: data.gridHeight,
          stats: recalculateStats(pixels),
          settings: data.settings || { colorLimit: 12, distanceAlgorithm: 'CIEDE2000', removeBackground: true, brightness: 100, contrast: 100, saturation: 100, panelPreset: 'custom', customWidth: data.gridWidth, kMedoidsOptimize: false },
          originalImage: typeof data.originalImage === 'string' ? data.originalImage : undefined,
          aspectRatio: normalizeAspectRatio(data.aspectRatio),
        });
      } catch { resolve(null); }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
