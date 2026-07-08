const API_ENDPOINT = '/api/enhance';
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_IMAGE_DIMENSION = 1024;

export interface EnhanceOptions {
  prompt: string;
  model?: string;
  signal?: AbortSignal;
}

function downscaleImage(dataUrl: string, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) { resolve(dataUrl); return; }
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('图片读取失败'));
    };
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

export async function checkEnhanceConfigured(): Promise<boolean> {
  try {
    const res = await fetch(API_ENDPOINT, { method: 'GET' });
    const data = await res.json() as { configured?: boolean };
    return data.configured === true;
  } catch {
    return false;
  }
}

export async function enhanceImage(imageDataUrl: string, options: EnhanceOptions): Promise<string> {
  const downscaled = await downscaleImage(imageDataUrl, MAX_IMAGE_DIMENSION);

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

  const signal = options.signal
    ? mergeSignals(options.signal, timeoutController.signal)
    : timeoutController.signal;

  let response: Response;
  try {
    response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: downscaled,
        prompt: options.prompt,
        model: options.model,
      }),
      signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('AI 增强请求被取消或超时。');
    }
    throw new Error(`网络请求失败：${err instanceof Error ? err.message : String(err)}`);
  }
  clearTimeout(timeoutId);

  const data = await response.json() as { image?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error || `服务器错误 (${response.status})`);
  }

  if (!data.image) {
    throw new Error('服务器响应中未找到图片数据。');
  }

  return data.image;
}

function mergeSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) { controller.abort(); break; }
    s.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export function buildEnhancePrompt(options: {
  enhanceStrength: 'light' | 'medium' | 'strong';
  flatColors: boolean;
  cartoonStyle: boolean;
  customPrompt: string;
}): string {
  const parts: string[] = [];

  switch (options.enhanceStrength) {
    case 'strong':
      parts.push('extreme simplification, posterize, large flat solid color blocks, minimal shapes, very few colors, no fine details, no textures, no gradients, no dithering, no checkerboard patterns, sharp clean edges');
      break;
    case 'medium':
      parts.push('simplified, posterize, flat color regions, no fine textures, no dithering, clean edges');
      break;
    case 'light':
      parts.push('moderate simplification, preserve important features');
      break;
  }

  parts.push('flat pixel art style, clean smooth surfaces, no noise, no artifacts');

  if (options.flatColors) parts.push('flat uniform colors, no gradients');
  if (options.cartoonStyle) parts.push('cartoon style, vector art');

  if (options.customPrompt.trim()) parts.push(options.customPrompt.trim());

  return parts.join(', ');
}
