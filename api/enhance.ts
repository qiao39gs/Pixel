import type { VercelRequest, VercelResponse } from '@vercel/node';

const POLLINATIONS_BASE_URL = 'https://gen.pollinations.ai';
const DEFAULT_MODEL = 'klein';
const REQUEST_TIMEOUT_MS = 60_000;

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ configured: !!process.env.POLLINATIONS_API_KEY });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 POLLINATIONS_API_KEY' });
  }

  const { image, prompt, model } = (req.body || {}) as { image?: string; prompt?: string; model?: string };
  if (!image || !prompt) {
    return res.status(400).json({ error: '缺少 image 或 prompt 参数' });
  }

  const imageSizeKB = Math.round(image.length * 0.75 / 1024);
  console.log(`[enhance] 收到请求: image=${imageSizeKB}KB, model=${model || DEFAULT_MODEL}, prompt=${prompt.slice(0, 80)}...`);

  try {
    const imageRes = await fetch(image);
    const imageBlob = await imageRes.blob();
    console.log(`[enhance] 图片转换 blob: ${Math.round(imageBlob.size / 1024)}KB`);

    const formData = new FormData();
    formData.append('image', imageBlob, 'source.png');
    formData.append('prompt', prompt);
    formData.append('model', model || DEFAULT_MODEL);
    formData.append('n', '1');
    formData.append('size', 'auto');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    console.log(`[enhance] 开始调用 Pollinations...`);
    let response: Response;
    try {
      response = await fetch(`${POLLINATIONS_BASE_URL}/v1/images/edits`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error(`[enhance] Pollinations 请求超时 (${REQUEST_TIMEOUT_MS}ms)`);
        return res.status(504).json({ error: 'AI 增强请求超时' });
      }
      console.error(`[enhance] Pollinations 请求失败:`, err);
      return res.status(502).json({ error: `Pollinations 请求失败：${err instanceof Error ? err.message : String(err)}` });
    }
    clearTimeout(timeoutId);
    console.log(`[enhance] Pollinations 响应: ${response.status} ${response.headers.get('content-type')}`);

    if (!response.ok) {
      let message = `API 错误 (${response.status})`;
      try {
        const errBody = await response.json() as { error?: { message?: string }; message?: string };
        const inner = errBody?.error?.message || errBody?.message;
        if (inner) message = `${message}：${inner}`;
      } catch { /* ignore */ }
      if (response.status === 401) message = 'Pollinations API Key 无效或未授权';
      else if (response.status === 402) message = 'Pollinations 账户余额不足';
      return res.status(response.status).json({ error: message });
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.startsWith('image/')) {
      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      const base64 = buffer.toString('base64');
      return res.status(200).json({ image: `data:image/png;base64,${base64}` });
    }

    const data = await response.json() as {
      data?: Array<{ b64_json?: string; url?: string }>;
      b64_json?: string;
      url?: string;
    };

    const first = data?.data?.[0];
    if (first?.b64_json) return res.status(200).json({ image: `data:image/png;base64,${first.b64_json}` });
    if (first?.url) {
      const imgRes = await fetch(first.url);
      const blob = await imgRes.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      const base64 = buffer.toString('base64');
      return res.status(200).json({ image: `data:image/png;base64,${base64}` });
    }
    if (data?.b64_json) return res.status(200).json({ image: `data:image/png;base64,${data.b64_json}` });
    if (data?.url) {
      const imgRes = await fetch(data.url);
      const blob = await imgRes.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      const base64 = buffer.toString('base64');
      return res.status(200).json({ image: `data:image/png;base64,${base64}` });
    }

    return res.status(502).json({ error: 'Pollinations 响应中未找到图片数据' });
  } catch (err) {
    return res.status(500).json({ error: `服务器错误：${err instanceof Error ? err.message : String(err)}` });
  }
}
