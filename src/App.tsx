/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import PatternWorkspace from './components/PatternWorkspace';
import { generateHighResPng, generateMultiPagePdf } from './utils/exportUtils';
import { TransformedPixel, IngredientStat } from './types';

export default function App() {
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:3' | 'auto'>('auto');

  // Completed Crop phase
  const handleImageCropped = useCallback((imageDataUrl: string) => {
    setCroppedImage(imageDataUrl);
  }, []);

  const handleReset = useCallback(() => {
    setCroppedImage(null);
  }, []);

  // PNG trigger download
  const handleGeneratePng = useCallback((
    pixels: TransformedPixel[],
    width: number,
    height: number,
    stats: IngredientStat[],
    options?: { showRulers: boolean; showNumbers: boolean }
  ) => {
    const dataUrl = generateHighResPng(pixels, width, height, stats, options);
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Perler_Bead_Pattern_${width}x${height}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // PDF trigger download
  const handleGeneratePdf = useCallback((
    pixels: TransformedPixel[],
    width: number,
    height: number,
    stats: IngredientStat[],
    options?: { showRulers: boolean; showNumbers: boolean }
  ) => {
    generateMultiPagePdf(pixels, width, height, stats, options);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#18181B] flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FAFAF7]/90 backdrop-blur-md border-b border-black/[0.07] px-4 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-[15px] tracking-tight text-[#18181B]">像素拼豆</span>
            <span className="hidden sm:inline text-[11px] font-mono text-zinc-400 border border-zinc-200 px-1.5 py-0.5 rounded-md">v1.0</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono hidden md:block">PIXEL BEAD PATTERN GENERATOR</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-8 flex flex-col gap-8">

        {/* Hero — only when no image */}
        {!croppedImage && (
          <div className="relative text-center max-w-lg mx-auto pt-6 pb-2 flex flex-col items-center gap-3 animate-fade-in">
            {/* Pixel grid decoration */}
            <div
              className="absolute inset-x-0 top-0 h-full -z-10 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(232,87,10,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(232,87,10,0.05) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                maskImage: 'radial-gradient(ellipse 80% 90% at 50% 40%, black 30%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 80% 90% at 50% 40%, black 30%, transparent 100%)',
              }}
            />
            <h2 className="font-display font-bold text-[2.8rem] sm:text-[3.5rem] leading-[1.05] tracking-tight text-[#18181B]">
              图片变<br />
              <span className="text-[#E8570A]">拼豆图纸</span>
            </h2>
            <p className="text-sm text-zinc-500 font-normal">
              CIEDE2000 精准色差 · 支持 PNG / PDF 导出
            </p>
          </div>
        )}

        {/* Upload / Workspace */}
        {!croppedImage ? (
          <div className="max-w-2xl w-full mx-auto animate-fade-in">
            <ImageUploader
              onImageCropped={handleImageCropped}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
            />
          </div>
        ) : (
          <div className="w-full animate-fade-in">
            <PatternWorkspace
              croppedImageDataUrl={croppedImage}
              onReset={handleReset}
              aspectRatio={aspectRatio}
              onGeneratePng={handleGeneratePng}
              onGeneratePdf={handleGeneratePdf}
            />
          </div>
        )}

      </main>

      {/* Footer */}
      {!croppedImage && (
        <footer className="border-t border-black/[0.06] px-4 py-5">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>© 2025 像素拼豆图纸生成器</span>
            <span>Perler Bead Pattern Generator</span>
          </div>
        </footer>
      )}

    </div>
  );
}
