import { useEffect, useRef } from 'react';
import { quantizeImage, PaletteItemWithCache, DistanceAlgorithm } from '../utils/quantizeImage';
import { useWorkspaceStore } from '../store/workspaceStore';

interface Params {
  croppedImageDataUrl: string;
  removeBackground: boolean;
  colorLimit: number;
  distanceAlgorithm: DistanceAlgorithm;
  kMedoidsOptimize: boolean;
  currentPalette: PaletteItemWithCache[];
  gridWidth: number;
  gridHeight: number;
  brightness: number;
  contrast: number;
  saturation: number;
}

export function useImageProcessing({
  croppedImageDataUrl, removeBackground,
  colorLimit, distanceAlgorithm, kMedoidsOptimize, currentPalette,
  gridWidth, gridHeight, brightness, contrast, saturation,
}: Params) {
  const setTransformedPixels = useWorkspaceStore(s => s.setTransformedPixels);
  const setStats = useWorkspaceStore(s => s.setStats);
  const setIsProcessing = useWorkspaceStore(s => s.setIsProcessing);
  const setLocalAspectRatio = useWorkspaceStore(s => s.setLocalAspectRatio);
  const setGridWidthActual = useWorkspaceStore(s => s.setGridWidthActual);
  const setGridHeightActual = useWorkspaceStore(s => s.setGridHeightActual);
  const setPipelineMode = useWorkspaceStore(s => s.setPipelineMode);
  const lastImageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!croppedImageDataUrl) {
      setTransformedPixels([]);
      setStats([]);
      setIsProcessing(false);
      return;
    }

    if (lastImageRef.current !== croppedImageDataUrl) {
      lastImageRef.current = croppedImageDataUrl;
      if (useWorkspaceStore.getState().pipelineMode !== 'skipOnce' && useWorkspaceStore.getState().pipelineMode !== 'skipAndHold') {
        useWorkspaceStore.setState({ currentProjectId: null });
      }
    }

    const mode = useWorkspaceStore.getState().pipelineMode;
    if (mode === 'skipOnce') {
      setPipelineMode('process');
      setIsProcessing(false);
      return;
    }
    if (mode === 'skipAndHold' || mode === 'paused') {
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    let active = true;
    const img = new Image();
    img.src = croppedImageDataUrl;
    img.onload = () => {
      if (!active) return;
      setLocalAspectRatio(img.width / img.height);

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = img.width;
      srcCanvas.height = img.height;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) { setIsProcessing(false); return; }
      srcCtx.drawImage(img, 0, 0);
      const imageData = srcCtx.getImageData(0, 0, img.width, img.height);

      const result = quantizeImage(imageData, currentPalette, {
        gridWidth, gridHeight, colorLimit, distanceAlgorithm,
        kMedoidsOptimize, removeBackground, brightness, contrast, saturation,
      });

      if (!active) return;
      setTransformedPixels(result.pixels);
      setStats(result.stats);
      setGridWidthActual(result.gridWidth);
      setGridHeightActual(result.gridHeight);
      useWorkspaceStore.getState().setTopTrim(0);
      useWorkspaceStore.getState().setBottomTrim(0);
      useWorkspaceStore.getState().setLeftTrim(0);
      useWorkspaceStore.getState().setRightTrim(0);
      setIsProcessing(false);
    };
    img.onerror = () => { if (active) setIsProcessing(false); };
    return () => { active = false; };
  }, [
    croppedImageDataUrl, gridWidth, gridHeight, colorLimit, currentPalette,
    distanceAlgorithm, kMedoidsOptimize, removeBackground, brightness, contrast, saturation,
    setTransformedPixels, setStats, setIsProcessing, setLocalAspectRatio,
    setGridWidthActual, setGridHeightActual, setPipelineMode,
  ]);
}
