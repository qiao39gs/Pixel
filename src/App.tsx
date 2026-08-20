/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import ImageUploader from './components/ImageUploader';
import HomeProjectActions from './components/HomeProjectActions';
import PatternWorkspace from './components/PatternWorkspace';
import Toasts from './components/workspace/Toasts';
import { generateHighResPng, generateMultiPagePdf } from './utils/exportUtils';
import { TransformedPixel, IngredientStat } from './types';
import { clearDraft, loadDraft } from './utils/projectStorage';
import { useWorkspaceStore } from './store/workspaceStore';
import { AspectRatio } from './utils/constants';

export default function App() {
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto');
  const [uploaderHasImage, setUploaderHasImage] = useState(false);

  useEffect(() => {
    let active = true;
    loadDraft().then(draft => {
      if (!active || !draft) return;
      if (!window.confirm(`发现 ${draft.savedAt} 自动保存的未完成项目，是否恢复？`)) {
        clearDraft().catch(() => {});
        return;
      }
      const ar = draft.aspectRatio ?? 'auto';
      useWorkspaceStore.getState().loadProject(draft.pixels, draft.meta.gridWidth, draft.meta.gridHeight, draft.stats, draft.settings, !!draft.originalImage, draft.currentProjectId ?? undefined, draft.currentProjectName ?? undefined);
      useWorkspaceStore.setState({ isDirty: true, saveStatus: 'idle' });
      setAspectRatio(ar);
      setCroppedImage(draft.originalImage ?? null);
      setWorkspaceOpen(true);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  // Completed Crop phase
  const handleImageCropped = useCallback((imageDataUrl: string) => {
    useWorkspaceStore.setState({ kMedoidsOptimize: true, pipelineMode: 'process' });
    setCroppedImage(imageDataUrl);
    setWorkspaceOpen(true);
  }, []);

  const handleReset = useCallback(() => {
    setCroppedImage(null);
    setWorkspaceOpen(false);
  }, []);

  const handleRestoreImage = useCallback((image: string | null, ar: AspectRatio) => {
    setAspectRatio(ar);
    setCroppedImage(image);
    setWorkspaceOpen(true);
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

      {/* Header — 仅在上传入口阶段显示，进入编辑器后让 EditorFrame 满屏 */}
      {!workspaceOpen && (
        <header className="sticky top-0 z-50 bg-[#FAFAF7]/90 backdrop-blur-md border-b border-black/[0.07] px-4 py-3.5">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-display font-bold text-[15px] tracking-tight text-[#18181B]">像素拼豆</span>
              <span className="hidden sm:inline text-xs font-mono text-zinc-400 border border-zinc-200 px-1.5 py-0.5 rounded-md">v1.0.6</span>
            </div>
            <a href="https://github.com/qiao39gs/Pixel" target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 font-mono hover:text-[#E8570A] transition-colors">GitHub</a>
          </div>
        </header>
      )}

      {/* Main */}
      <main className="flex-1 w-full mx-auto px-4 py-6 md:py-8 flex flex-col gap-8">

        {!workspaceOpen && !uploaderHasImage && (
          <div className="relative text-center max-w-lg mx-auto pt-6 pb-2 flex flex-col items-center gap-3 animate-fade-in">
            <div
              className="absolute inset-x-0 top-0 h-full -z-10 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(232,87,10,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(232,87,10,0.05) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                maskImage: 'radial-gradient(ellipse 80% 90% at 50% 40%, black 30%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 80% 90% at 50% 40%, black 30%, transparent 100%)',
              }}
            />
            <h1 className="font-display font-bold text-[2.8rem] sm:text-[3.5rem] leading-[1.05] tracking-tight text-[#18181B]">
              图片变<br />
              <span className="text-[#E8570A]">拼豆图纸</span>
            </h1>
          </div>
        )}

        {/* Upload / Workspace */}
        {!workspaceOpen ? (
          <div className="max-w-4xl w-full mx-auto animate-fade-in">
            <ImageUploader
              onImageCropped={handleImageCropped}
              onImageStateChange={setUploaderHasImage}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
            />
            {!uploaderHasImage ? <HomeProjectActions onOpenWorkspace={handleRestoreImage} /> : null}
          </div>
        ) : (
          <PatternWorkspace
            croppedImageDataUrl={croppedImage}
            onReset={handleReset}
            aspectRatio={aspectRatio}
            onGeneratePng={handleGeneratePng}
            onGeneratePdf={handleGeneratePdf}
            onRestoreImage={handleRestoreImage}
          />
        )}

      </main>

      {/* Footer */}
      {!workspaceOpen && (
        <footer className="border-t border-black/[0.06] px-4 py-5">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>© 2026 像素拼豆图纸生成器</span>
            <div className="flex items-center gap-4">
              <span>Perler Bead Pattern Generator</span>
            </div>
          </div>
        </footer>
      )}

      <Toasts />
      <Analytics />
    </div>
  );
}
