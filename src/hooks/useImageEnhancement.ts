import { useEffect, useRef, useCallback } from 'react';
import { enhanceImage, buildEnhancePrompt } from '../services/pollinationsApi';
import { useWorkspaceStore } from '../store/workspaceStore';

interface CacheEntry {
  sourceImage: string;
  optionsKey: string;
  result: string;
}

let cache: CacheEntry | null = null;

function optionsKey(
  opts: ReturnType<typeof useWorkspaceStore.getState>['aiEnhanceOptions'],
  pattern: { gridWidth: number; gridHeight: number; colorLimit: number; removeBackground: boolean },
): string {
  return `${opts.enhanceStrength}|${opts.flatColors}|${opts.cartoonStyle}|${opts.customPrompt.trim()}|${pattern.gridWidth}x${pattern.gridHeight}|${pattern.colorLimit}|${pattern.removeBackground}`;
}

export function useImageEnhancement(
  croppedImageDataUrl: string | null,
  patternOptions: { gridWidth: number; gridHeight: number; colorLimit: number; removeBackground: boolean },
) {
  const aiEnhanceOptions = useWorkspaceStore(s => s.aiEnhanceOptions);
  const setIsAiEnhancing = useWorkspaceStore(s => s.setIsAiEnhancing);
  const setAiEnhanceError = useWorkspaceStore(s => s.setAiEnhanceError);
  const setAiEnhancedImage = useWorkspaceStore(s => s.setAiEnhancedImage);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setAiEnhancedImage(null);
    setAiEnhanceError(null);
    setIsAiEnhancing(false);
    cache = null;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [croppedImageDataUrl, setAiEnhancedImage, setAiEnhanceError, setIsAiEnhancing]);

  const triggerEnhance = useCallback(() => {
    if (!croppedImageDataUrl) return;
    if (useWorkspaceStore.getState().hasManualEdits && !window.confirm('AI 增强会重新生成图纸并覆盖当前手工编辑，是否继续？')) return;

    const oKey = optionsKey(aiEnhanceOptions, patternOptions);
    if (cache && cache.sourceImage === croppedImageDataUrl && cache.optionsKey === oKey) {
      setAiEnhancedImage(cache.result);
      setAiEnhanceError(null);
      setIsAiEnhancing(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsAiEnhancing(true);
    setAiEnhanceError(null);
    setAiEnhancedImage(null);

    const prompt = buildEnhancePrompt({ ...aiEnhanceOptions, ...patternOptions });

    enhanceImage(croppedImageDataUrl, { prompt, enhanceStrength: aiEnhanceOptions.enhanceStrength, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        cache = { sourceImage: croppedImageDataUrl, optionsKey: oKey, result };
        setAiEnhancedImage(result);
        setAiEnhanceError(null);
        setIsAiEnhancing(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setAiEnhanceError(message);
        setAiEnhancedImage(null);
        setIsAiEnhancing(false);
      });
  }, [croppedImageDataUrl, aiEnhanceOptions, patternOptions, setIsAiEnhancing, setAiEnhanceError, setAiEnhancedImage]);

  const aiEnhancedImage = useWorkspaceStore(s => s.aiEnhancedImage);
  const isAiEnhancing = useWorkspaceStore(s => s.isAiEnhancing);
  const aiEnhanceError = useWorkspaceStore(s => s.aiEnhanceError);

  const effectiveImage = aiEnhancedImage ?? croppedImageDataUrl;

  return { effectiveImage, isAiEnhancing, aiEnhanceError, triggerEnhance };
}
