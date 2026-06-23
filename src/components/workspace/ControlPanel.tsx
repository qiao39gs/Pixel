import React from 'react';
import { ZoomIn, ZoomOut, Sliders, Hash, Grid3X3, Layers, Trash2 } from 'lucide-react';
import { BeadPaletteItem } from '../../types';

interface Props {
  panelPreset: '52x52' | '78x78' | '104x104' | 'custom';
  setPanelPreset: (v: '52x52' | '78x78' | '104x104' | 'custom') => void;
  customWidth: number;
  setCustomWidth: (v: number) => void;
  imageAspectRatio: number;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  colorLimit: number;
  setColorLimit: (v: number) => void;
  distanceAlgorithm: 'CIEDE2000' | 'CIE94' | 'CIE76' | 'WeightedRGB';
  setDistanceAlgorithm: (v: 'CIEDE2000' | 'CIE94' | 'CIE76' | 'WeightedRGB') => void;
  removeBackground: boolean;
  setRemoveBackground: (v: boolean) => void;
  scale: number;
  setScale: (fn: (prev: number) => number) => void;
  setScaleDirect: (v: number) => void;
  showNumbers: boolean;
  setShowNumbers: (v: boolean) => void;
  showRulers: boolean;
  setShowRulers: (v: boolean) => void;
  onReset: () => void;
}

export default function ControlPanel({ panelPreset, setPanelPreset, customWidth, setCustomWidth, imageAspectRatio, aspectRatio, colorLimit, setColorLimit, distanceAlgorithm, setDistanceAlgorithm, removeBackground, setRemoveBackground, scale, setScale, setScaleDirect, showNumbers, setShowNumbers, showRulers, setShowRulers, onReset }: Props) {
  const presetBtn = (val: typeof panelPreset, label: string) => (
    <button
      onClick={() => setPanelPreset(val)}
      className={`py-2.5 px-3 text-xs font-bold rounded-xl text-center border cursor-pointer transition-all ${panelPreset === val ? 'bg-indigo-50 text-indigo-600 border-indigo-500 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
    >{label}</button>
  );

  const algoBtn = (val: typeof distanceAlgorithm, label: string, title: string) => (
    <button
      onClick={() => setDistanceAlgorithm(val)}
      title={title}
      className={`py-1.5 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${distanceAlgorithm === val ? 'bg-white text-indigo-600 shadow-xs border border-indigo-100 font-extrabold' : 'text-slate-400 hover:text-slate-600'}`}
    >{label}</button>
  );

  const toggle = (checked: boolean, onClick: () => void, disabled?: boolean) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-1'}`} />
    </button>
  );

  return (
    <div className="w-full lg:col-span-4 flex flex-col gap-5">
      <div className="bg-white rounded-3xl border border-black/[0.04] p-6 shadow-sm flex flex-col gap-5 transition-all">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h3 className="font-display font-bold text-slate-900 flex items-center gap-2 text-sm leading-none">
            <Sliders className="w-4 h-4 text-indigo-600" />生成图纸规格
          </h3>
          <button onClick={onReset} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-1 cursor-pointer">
            <Trash2 className="w-3.5" /> 重选图片
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">模板画布规格 (格子数)</label>
          <div className="grid grid-cols-2 gap-2">
            {presetBtn('52x52', '52 × 52 (小)')}
            {presetBtn('78x78', '78 × 78 (中)')}
            {presetBtn('104x104', '104 × 104 (大)')}
            {presetBtn('custom', '自定义规格')}
          </div>
          {panelPreset === 'custom' && (
            <div className="flex items-center gap-2.5 mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-black/[0.02]">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">宽度 (格子)</span>
                <input type="number" min="5" max="150" value={customWidth} onChange={e => setCustomWidth(parseInt(e.target.value) || 29)}
                  className="w-full p-1.5 border border-slate-200 text-xs text-center font-mono rounded bg-white focus:outline-indigo-500" />
              </div>
              <div className="text-slate-400 text-xs pt-3 font-semibold">×</div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">高度 (锁比例)</span>
                <div className="w-full p-1.5 border border-slate-100 text-xs text-center font-mono rounded bg-slate-100 text-slate-500 select-none font-semibold">
                  {aspectRatio === 'auto' ? Math.max(1, Math.round(customWidth / imageAspectRatio))
                    : Math.round(customWidth * ({'1:1':1,'4:3':3/4,'3:4':4/3,'16:9':9/16,'9:16':16/9}[aspectRatio] ?? 1))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">限制色号数量 (色彩量化)</span>
            <span className="font-mono px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md font-bold text-xs">{colorLimit} 色以内</span>
          </div>
          <input type="range" min="2" max="64" value={colorLimit} onChange={e => setColorLimit(parseInt(e.target.value))}
            className="w-full h-1.5 accent-indigo-600 bg-slate-200 rounded-lg cursor-pointer animate-all" />
          <span className="text-[10px] text-slate-400 leading-normal">限制图纸最终出现的最多拼豆颜色，数量少可大幅降低图纸制作与购买复杂度。</span>
        </div>

        <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
          <div className="flex justify-between items-center text-[11px] text-slate-500">
            <span className="font-bold text-slate-600">空间色差比对算法</span>
            <span className="font-mono text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">{distanceAlgorithm}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            {algoBtn('CIEDE2000', 'CIEDE2000 (精细)', '国际照明委员会推荐的最精确感知色差计算公式')}
            {algoBtn('CIE94', 'CIE94 (感知)', '图形艺术及纺织工业标准')}
            {algoBtn('CIE76', 'CIE76 (常规)', '经典的 CIE L*a*b* 空间常规三维欧氏距离')}
            {algoBtn('WeightedRGB', '红均加权 (RGB)', '针对人眼对不同颜色波长敏感度不一致的动态加权算法')}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">自动过滤白色/浅色背景</span>
            <button onClick={() => setRemoveBackground(!removeBackground)}
              className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors cursor-pointer ${removeBackground ? 'bg-indigo-600' : 'bg-slate-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${removeBackground ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">开启后将智能识别灰度接近纯白的浅色底背景像素，将其设为透明并不填充任何豆子。</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-black/[0.04] p-5 shadow-sm flex flex-col gap-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />视图网格交互
        </h4>
        <div>
          <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
            <span className="font-semibold">格子缩放像素</span>
            <span className="font-mono font-bold text-indigo-600">{scale}px</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setScale(p => Math.max(8, p - 2))} className="p-1 px-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-250 transition-colors cursor-pointer"><ZoomOut className="w-3.5 h-3.5" /></button>
            <input type="range" min="8" max="32" step="1" value={scale} onChange={e => setScaleDirect(parseInt(e.target.value))}
              className="flex-1 accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer" />
            <button onClick={() => setScale(p => Math.min(32, p + 2))} className="p-1 px-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-250 transition-colors cursor-pointer"><ZoomIn className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-700 font-semibold flex items-center gap-1"><Grid3X3 className="w-3.5 h-3.5 text-slate-400" /> 预览与导出显示行号列号</span>
            {toggle(showRulers, () => setShowRulers(!showRulers))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-700 font-semibold flex items-center gap-1"><Hash className="w-3.5 h-3.5 text-slate-400" /> 图纸格子覆盖色号标识</span>
            <button onClick={() => setShowNumbers(!showNumbers)} disabled={scale < 12} title={scale < 12 ? '请拉大网格显示尺寸以开启色号' : ''}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${showNumbers ? 'bg-indigo-600' : 'bg-slate-200'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showNumbers ? 'translate-x-4.5' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        {scale < 16 && showNumbers && (
          <p className="text-[10px] text-amber-600 leading-tight">提示: 网格渲染尺寸较小 (当前 {scale}px)，图纸中可能会无法看清标记，建议调拉高上方网格尺寸。</p>
        )}
      </div>
    </div>
  );
}
