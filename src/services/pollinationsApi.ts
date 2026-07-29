const API_ENDPOINT = '/api/enhance';
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_IMAGE_DIMENSION = 1024;

export interface EnhanceOptions {
  prompt: string;
  enhanceStrength: 'light' | 'medium' | 'strong';
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

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

async function blendEnhancement(source: string, enhanced: string, strength: EnhanceOptions['enhanceStrength']): Promise<string> {
  const opacity = strength === 'light' ? 0.45 : strength === 'medium' ? 0.75 : 1;
  const [sourceImage, enhancedImage] = await Promise.all([loadImage(source), loadImage(enhanced)]);
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.naturalWidth;
  canvas.height = sourceImage.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (opacity < 1) ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = opacity;
  ctx.drawImage(enhancedImage, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
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

  return blendEnhancement(downscaled, data.image, options.enhanceStrength);
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
  gridWidth: number;
  gridHeight: number;
  colorLimit: number;
  removeBackground: boolean;
}): string {
  const parts: string[] = [];

  switch (options.enhanceStrength) {
    case 'strong':
      parts.push('strongly simplify the source into only the essential shapes and features');
      break;
    case 'medium':
      parts.push('moderately simplify the source while retaining recognizable features');
      break;
    case 'light':
      parts.push('gently simplify the source and closely preserve its appearance');
      break;
  }

  parts.push('clean flat vector illustration with large connected color regions and crisp smooth boundaries');
  if (options.cartoonStyle) parts.push('cartoon style, vector art');
  if (options.customPrompt.trim()) parts.push(options.customPrompt.trim());

  parts.push(`prepare the image for conversion to a ${options.gridWidth} by ${options.gridHeight} fuse bead pattern using at most ${options.colorLimit} colors`);
  parts.push('strictly preserve the original composition, subject identity, pose, proportions, silhouette, and important facial features');
  parts.push('represent important features with large connected regions and remove details thinner than 2 grid cells');
  if (options.flatColors) parts.push('use flat uniform colors with no gradients or shading transitions');
  if (options.removeBackground) parts.push('replace the background with pure solid white, with a clean well-defined subject boundary and no cast shadow');
  else parts.push('simplify the background into large coherent color regions without adding new objects');
  parts.push('do not add or remove subjects, no isolated pixels, no tiny color islands, no fine textures, no noise, no dithering, no checkerboard patterns, no pixel art grid, no artifacts');

  return parts.join(', ');
}
