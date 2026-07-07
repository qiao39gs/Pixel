const POLLINATIONS_BASE_URL = 'https://gen.pollinations.ai';
const DEFAULT_MODEL = 'klein';
const REQUEST_TIMEOUT_MS = 60_000;

export interface EnhanceOptions {
  prompt: string;
  model?: string;
  signal?: AbortSignal;
}

function getApiKey(): string {
  const key = import.meta.env.VITE_POLLINATIONS_API_KEY as string | undefined;
  if (!key) throw new Error('未配置 Pollinations API Key，请在 .env 中设置 VITE_POLLINATIONS_API_KEY。');
  return key;
}

function getModel(): string {
  return (import.meta.env.VITE_POLLINATIONS_MODEL as string | undefined) || DEFAULT_MODEL;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

function blobToDataUrl(blob: Blob): Promise<string> {
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

export async function enhanceImage(imageDataUrl: string, options: EnhanceOptions): Promise<string> {
  const apiKey = getApiKey();
  const model = options.model || getModel();

  const imageBlob = await dataUrlToBlob(imageDataUrl);
  const formData = new FormData();
  formData.append('image', imageBlob, 'source.png');
  formData.append('prompt', options.prompt);
  formData.append('model', model);
  formData.append('n', '1');
  formData.append('size', 'auto');

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

  const signal = options.signal
    ? mergeSignals(options.signal, timeoutController.signal)
    : timeoutController.signal;

  let response: Response;
  try {
    response = await fetch(`${POLLINATIONS_BASE_URL}/v1/images/edits`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
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

  if (!response.ok) {
    let message = `API 错误 (${response.status})`;
    try {
      const errBody = await response.json() as { error?: { message?: string }; message?: string };
      const inner = errBody?.error?.message || errBody?.message;
      if (inner) message = `${message}：${inner}`;
    } catch { /* ignore */ }
    if (response.status === 401) message = 'API Key 无效或未授权，请检查 VITE_POLLINATIONS_API_KEY。';
    else if (response.status === 402) message = 'Pollinations 账户余额不足。';
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.startsWith('image/')) {
    const blob = await response.blob();
    return blobToDataUrl(blob);
  }

  const data = await response.json() as {
    data?: Array<{ b64_json?: string; url?: string }>;
    b64_json?: string;
    url?: string;
  };

  const first = data?.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first?.url) {
    const imgRes = await fetch(first.url);
    const blob = await imgRes.blob();
    return blobToDataUrl(blob);
  }
  if (data?.b64_json) return `data:image/png;base64,${data.b64_json}`;
  if (data?.url) {
    const imgRes = await fetch(data.url);
    const blob = await imgRes.blob();
    return blobToDataUrl(blob);
  }

  throw new Error('API 响应中未找到图片数据。');
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
