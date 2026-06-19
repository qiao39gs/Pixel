/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import PatternWorkspace from './components/PatternWorkspace';
import { generateHighResPng, generateMultiPagePdf } from './utils/exportUtils';
import { TransformedPixel, IngredientStat } from './types';
import { Sparkles, Grid3X3, Github, ShieldAlert, BadgeCheck, Flame, Layers } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F5F5F7] text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-800">
      
      {/* Upper Navigation Bar - Clean, rounded floating Bento item */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-black/[0.04] px-4 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo brand with a creative Bento look */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-rose-500 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/10 hover:scale-105 transition-all duration-300">
              <Grid3X3 className="w-5.5 h-5.5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-extrabold text-gray-900 text-base leading-none tracking-tight">
                  像素拼豆图纸生成器
                </h1>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100/60 px-1.5 py-0.2 rounded-md font-bold">
                  Bento Pro v1.0
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5 font-semibold font-mono tracking-wider">
                PIXEL BEAD PATTERN GENERATOR
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">

        {/* Dynamic introduction hero if uploading */}
        {!croppedImage && (
          <div className="text-center max-w-2xl mx-auto my-6 flex flex-col items-center gap-3.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#4F46E5]/5 text-indigo-600 border border-indigo-500/10 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>智能色彩量化 · 国家标准 CIEDE2000 色差体系</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-display font-black text-gray-950 tracking-tight leading-tight">
              把喜欢的动漫图片，一键打磨成<br />
              <span className="bg-gradient-to-r from-indigo-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">完美拼豆网格图纸</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed max-w-xl">
              为拼豆（Perler Beads）手作玩家私人定制的工艺图纸生成引擎。一键进行最邻近像素量化，支持精准的 CIEDE2000 色差计算、拼板比例红线辅助刻度、图纸色号文字覆盖以及采购用量计算，支持 A4 高清多页打印分板导出！
            </p>
          </div>
        )}

        {/* Dynamic Route display upload cropper VS work board */}
        {!croppedImage ? (
          <div className="max-w-4xl w-full mx-auto animate-fade-in">
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

        {/* Advanced Tech features lists in a beautiful Bento structure */}
        {!croppedImage && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            
            <div className="bento-card p-6 flex flex-col gap-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 w-fit">
                <Flame className="w-5.5 h-5.5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-gray-900 text-sm tracking-tight mb-1.5">
                  精确颗粒清单
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  系统将自动根据您选择的画布颗粒规格，计算每一种拼豆色号的实际耗用量。提供颗粒总数支持玩家预算材料，折算成一袋1K的标准包装，避免多买、错买耗材。
                </p>
              </div>
            </div>

            <div className="bento-card p-6 flex flex-col gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-500 w-fit">
                <Layers className="w-5.5 h-5.5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-gray-900 text-sm tracking-tight mb-1.5">
                  A4 分页拼图打印 (PDF)
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  首创标准网格专属分割算法。如果是多拼板组合成的宏伟图作，可自动为您分页并绘制完整的网格切板标注，打印即可 1:1 置物拼缀，堪称终极手作助手。
                </p>
              </div>
            </div>

            <div className="bento-card p-6 flex flex-col gap-4">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 w-fit">
                <Sparkles className="w-5.5 h-5.5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-gray-900 text-sm tracking-tight mb-1.5">
                  高级 CIEDE2000 空间
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  通过将 RGB 颜色映射入三维色彩 Lab 坐标系，并使用尖端 CIEDE2000 色差配对公式进行最近邻居查找，排除了电脑屏幕亮度与人类肉眼感受的偏差。
                </p>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Page bottom footer */}
    </div>
  );
}
