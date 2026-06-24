import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Sliders, Hash, Grid3X3, Layers, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface Props {
  onReset: () => void;
}

function AdjustSlider({ label, value, onRelease }: { label: string; value: number; onRelease: (v: number) => void }) {
  const pending = useRef(value);
  const [local, setLocal] = useState(value);
  useEffect(() => { if (local === pending.current) { setLocal(value); pending.current = value; } }, [value]);
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-mono font-bold text-slate-500 w-11 text-right">{label}</span>
      <input
        type="range" min="0" max="200" value={local}
        onChange={e => { const v = parseInt(e.target.value); setLocal(v); pending.current = v; }}
        onMouseUp={() => { if (pending.current !== value) onRelease(pending.current); }}
        onTouchEnd={() => { if (pending.current !== value) onRelease(pending.current); }}
        className="flex-1 h-2.5 accent-[#E8570A] bg-slate-200 rounded-lg cursor-pointer"
      />
      <span className="text-xs font-mono font-bold text-slate-500 w-9">{local}</span>
    </div>
  );
}

export default function ControlPanel({ onReset }: Props) {
  const panelPreset = useWorkspaceStore(s => s.panelPreset);
  const setPanelPreset = useWorkspaceStore(s => s.setPanelPreset);
  const customWidth = useWorkspaceStore(s => s.customWidth);
  const setCustomWidth = useWorkspaceStore(s => s.setCustomWidth);
  const imageAspectRatio = useWorkspaceStore(s => s.imageAspectRatio);
  const colorLimit = useWorkspaceStore(s => s.colorLimit);
  const setColorLimit = useWorkspaceStore(s => s.setColorLimit);
  const brightness = useWorkspaceStore(s => s.brightness);
  const setBrightness = useWorkspaceStore(s => s.setBrightness);
  const contrast = useWorkspaceStore(s => s.contrast);
  const setContrast = useWorkspaceStore(s => s.setContrast);
  const saturation = useWorkspaceStore(s => s.saturation);
  const setSaturation = useWorkspaceStore(s => s.setSaturation);
  const distanceAlgorithm = useWorkspaceStore(s => s.distanceAlgorithm);
  const setDistanceAlgorithm = useWorkspaceStore(s => s.setDistanceAlgorithm);
  const removeBackground = useWorkspaceStore(s => s.removeBackground);
  const setRemoveBackground = useWorkspaceStore(s => s.setRemoveBackground);
  const scale = useWorkspaceStore(s => s.scale);
  const setScale = useWorkspaceStore(s => s.setScale);
  const showNumbers = useWorkspaceStore(s => s.showNumbers);
  const setShowNumbers = useWorkspaceStore(s => s.setShowNumbers);
  const showRulers = useWorkspaceStore(s => s.showRulers);
  const setShowRulers = useWorkspaceStore(s => s.setShowRulers);
  const mobileTab = useWorkspaceStore(s => s.mobileTab);
  const localAspectRatio = useWorkspaceStore(s => s.localAspectRatio);
  const autoDetectTrim = useWorkspaceStore(s => s.autoDetectTrim);
  const topTrim = useWorkspaceStore(s => s.topTrim);
  const bottomTrim = useWorkspaceStore(s => s.bottomTrim);
  const leftTrim = useWorkspaceStore(s => s.leftTrim);
  const rightTrim = useWorkspaceStore(s => s.rightTrim);
  const setTopTrim = useWorkspaceStore(s => s.setTopTrim);
  const setBottomTrim = useWorkspaceStore(s => s.setBottomTrim);
  const setLeftTrim = useWorkspaceStore(s => s.setLeftTrim);
  const setRightTrim = useWorkspaceStore(s => s.setRightTrim);
  const applyTrim = useWorkspaceStore(s => s.applyTrim);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);

  const presetBtn = (val: typeof panelPreset, label: string) => (
    <button onClick={() => setPanelPreset(val)}
      className={`py-2.5 px-3 text-xs font-bold rounded-xl text-center border cursor-pointer transition-all ${panelPreset === val ? 'bg-indigo-50 text-indigo-600 border-indigo-500 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{label}</button>
  );

  const algoBtn = (val: typeof distanceAlgorithm, label: string, title: string) => (
    <button onClick={() => setDistanceAlgorithm(val)} title={title}
      className={`py-2 text-xs font-bold rounded-lg text-center transition-all cursor-pointer ${distanceAlgorithm === val ? 'bg-white text-indigo-600 shadow-xs border border-indigo-100 font-extrabold' : 'text-slate-400 hover:text-slate-600'}`}>{label}</button>
  );

  return (
    <div className={`w-full lg:col-span-4 flex flex-col gap-5 ${mobileTab !== 'controls' ? 'hidden lg:flex' : ''}`}>
      <div className="bg-white rounded-3xl border border-black/[0.04] p-6 shadow-sm flex flex-col gap-5 transition-all">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h3 className="font-sans font-semibold text-slate-900 flex items-center gap-2 text-sm leading-none"><Sliders className="w-4 h-4 text-indigo-600" />生成图纸规格</h3>
          <button onClick={onReset} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-1 cursor-pointer"><Trash2 className="w-3.5" /> 重选图片</button>
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
              <div className="flex-1 flex flex-col gap-1"><span className="text-xs text-slate-400 font-bold uppercase">宽度 (格子)</span>
                <input type="number" min="5" max="150" value={customWidth} onChange={e => setCustomWidth(parseInt(e.target.value) || 29)} className="w-full p-2.5 border border-slate-200 text-xs text-center font-mono rounded bg-white focus:outline-indigo-500" />
              </div>
              <div className="text-slate-400 text-xs pt-3 font-semibold">×</div>
              <div className="flex-1 flex flex-col gap-1"><span className="text-xs text-slate-400 font-bold uppercase">高度 (锁比例)</span>
                <div className="w-full p-1.5 border border-slate-100 text-xs text-center font-mono rounded bg-slate-100 text-slate-500 select-none font-semibold">
                  {Math.max(1, Math.round(customWidth / (imageAspectRatio || localAspectRatio || 1)))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs"><span className="font-bold text-slate-700">限制色号数量 (色彩量化)</span>
            <span className="font-mono px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md font-bold text-xs">{colorLimit} 色以内</span></div>
          <input type="range" min="2" max="24" value={colorLimit} onChange={e => setColorLimit(parseInt(e.target.value))} className="w-full h-3 accent-indigo-600 bg-slate-200 rounded-lg cursor-pointer" />
          <span className="text-xs text-slate-400 leading-normal">限制图纸最终出现的最多拼豆颜色，数量少可大幅降低图纸制作与购买复杂度。</span>
        </div>
        <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
          <div className="flex justify-between items-center text-xs text-slate-500"><span className="font-bold text-slate-600">空间色差比对算法</span>
            <span className="font-mono text-xs bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">{distanceAlgorithm}</span></div>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            {algoBtn('CIEDE2000', 'CIEDE2000 (精细)', '国际照明委员会推荐的最精确感知色差计算公式')}
            {algoBtn('CIE94', 'CIE94 (感知)', '图形艺术及纺织工业标准')}
            {algoBtn('CIE76', 'CIE76 (常规)', '经典的 CIE L*a*b* 空间常规三维欧氏距离')}
            {algoBtn('WeightedRGB', '红均加权 (RGB)', '针对人眼对不同颜色波长敏感度不一致的动态加权算法')}
          </div>
        </div>
        <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">图像调节</span>
          <div className="flex flex-col gap-3">
            <AdjustSlider label="亮度"    value={brightness}    onRelease={setBrightness} />
            <AdjustSlider label="对比度"  value={contrast}      onRelease={setContrast} />
            <AdjustSlider label="饱和度"  value={saturation}    onRelease={setSaturation} />
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">自动过滤白色/浅色背景</span>
            <button onClick={() => setRemoveBackground(!removeBackground)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${removeBackground ? 'bg-indigo-600' : 'bg-slate-200'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${removeBackground ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-normal">开启后将智能识别灰度接近纯白的浅色底背景像素。</p>
        </div>
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">裁边修整</span>
            <div className="flex gap-2">
              <button onClick={() => autoDetectTrim(gridWidth, gridHeight)} className="px-2 py-1.5 text-xs font-bold rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer">自动裁剪</button>
              <button onClick={() => applyTrim(gridWidth, gridHeight)} className={`px-2 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${topTrim+bottomTrim+leftTrim+rightTrim === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'}`} disabled={topTrim+bottomTrim+leftTrim+rightTrim === 0}>应用</button>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-normal">拖动滑块预览裁切效果，点击「应用」确认。</p>
          {([
            ['上', topTrim, setTopTrim, Math.floor(gridHeight/2)] as const,
            ['下', bottomTrim, setBottomTrim, Math.floor(gridHeight/2)] as const,
            ['左', leftTrim, setLeftTrim, Math.floor(gridWidth/2)] as const,
            ['右', rightTrim, setRightTrim, Math.floor(gridWidth/2)] as const,
          ]).map(([label, val, set, max]) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold text-slate-500 w-5">{label}</span>
              <input type="range" min="0" max={max} value={val} onChange={e => set(parseInt(e.target.value))} className="flex-1 h-2.5 accent-[#E8570A] bg-slate-200 rounded-lg cursor-pointer" />
              <span className="text-xs font-mono font-bold text-slate-500 w-5 text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-3xl border border-black/[0.04] p-5 shadow-sm flex flex-col gap-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100"><Layers className="w-3.5 h-3.5 text-indigo-500" />视图网格交互</h4>
        <div>
          <div className="flex justify-between items-center text-xs text-slate-500 mb-1"><span className="font-semibold">格子缩放像素</span><span className="font-mono font-bold text-indigo-600">{scale}px</span></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setScale(Math.max(8, scale - 2))} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-250 transition-colors cursor-pointer"><ZoomOut className="w-3.5 h-3.5" /></button>
            <input type="range" min="8" max="32" step="1" value={scale} onChange={e => setScale(parseInt(e.target.value))} className="flex-1 accent-indigo-600 h-2.5 bg-slate-200 rounded-lg cursor-pointer" />
            <button onClick={() => setScale(Math.min(32, scale + 2))} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-250 transition-colors cursor-pointer"><ZoomIn className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><span className="text-xs text-slate-700 font-semibold flex items-center gap-1"><Grid3X3 className="w-3.5 h-3.5 text-slate-400" /> 预览与导出显示行号列号</span>
            <button onClick={() => setShowRulers(!showRulers)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${showRulers ? 'bg-indigo-600' : 'bg-slate-200'}`}><span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${showRulers ? 'translate-x-5.5' : 'translate-x-0.5'}`} /></button>
          </div>
          <div className="flex items-center justify-between"><span className="text-xs text-slate-700 font-semibold flex items-center gap-1"><Hash className="w-3.5 h-3.5 text-slate-400" /> 图纸格子覆盖色号标识</span>
            <button onClick={() => setShowNumbers(!showNumbers)} disabled={scale < 12} title={scale < 12 ? '请拉大网格显示尺寸以开启色号' : ''} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${showNumbers ? 'bg-indigo-600' : 'bg-slate-200'}`}><span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showNumbers ? 'translate-x-4.5' : 'translate-x-1'}`} /></button>
          </div>
        </div>
        {scale < 16 && showNumbers && <p className="text-xs text-amber-600 leading-tight">提示: 网格渲染尺寸较小 (当前 {scale}px)，图纸中可能会无法看清标记，建议调拉高上方网格尺寸。</p>}
      </div>
    </div>
  );
}
