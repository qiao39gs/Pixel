import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Hash, Grid3X3, Layers, Wand2, Loader2, AlertCircle, CheckCircle2, X, Crop, ZoomIn, ZoomOut } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { checkEnhanceConfigured } from '../../services/pollinationsApi';

function AdjustSlider({ label, value, onRelease }: { label: string; value: number; onRelease: (v: number) => boolean | void }) {
  const pending = useRef(value);
  const [local, setLocal] = useState(value);
  useEffect(() => { if (local === pending.current) { setLocal(value); pending.current = value; } }, [value]);
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-14 shrink-0 whitespace-nowrap text-right text-[13px] font-bold text-slate-500">{label}</span>
      <input
        type="range" min="0" max="200" value={local}
        onChange={e => { const v = parseInt(e.target.value); setLocal(v); pending.current = v; }}
        onMouseUp={() => { if (pending.current !== value && onRelease(pending.current) === false) { pending.current = value; setLocal(value); } }}
        onTouchEnd={() => { if (pending.current !== value && onRelease(pending.current) === false) { pending.current = value; setLocal(value); } }}
        className="flex-1 h-2.5 accent-[#E8570A] bg-stone-200 rounded-lg cursor-pointer"
      />
      <span className="text-[13px] font-mono font-bold text-slate-500 w-9">{local}</span>
    </div>
  );
}

// ── 统一分组标题 ──
function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-2.5 mb-4">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[13px] font-bold text-slate-700">{children}</span>
    </div>
  );
}

// ── 状态化 toggle——我统一样式 ──
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${on ? 'bg-[#E8570A]' : 'bg-stone-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

const SECTION_GAP = 'gap-6';
const GROUP_BG = 'bg-slate-50/60 border border-slate-200/60 rounded-xl p-3.5';

export function SpecSection() {
  const panelPreset = useWorkspaceStore(s => s.panelPreset);
  const setPanelPreset = useWorkspaceStore(s => s.setPanelPreset);
  const customWidth = useWorkspaceStore(s => s.customWidth);
  const setCustomWidth = useWorkspaceStore(s => s.setCustomWidth);
  const colorLimit = useWorkspaceStore(s => s.colorLimit);
  const setColorLimit = useWorkspaceStore(s => s.setColorLimit);
  const colorLimitPending = useRef(colorLimit);
  const [colorLimitLocal, setColorLimitLocal] = useState(colorLimit);
  useEffect(() => { if (colorLimitLocal === colorLimitPending.current) { setColorLimitLocal(colorLimit); colorLimitPending.current = colorLimit; } }, [colorLimit]);
  const distanceAlgorithm = useWorkspaceStore(s => s.distanceAlgorithm);
  const setDistanceAlgorithm = useWorkspaceStore(s => s.setDistanceAlgorithm);
  const kMedoidsOptimize = useWorkspaceStore(s => s.kMedoidsOptimize);
  const setKMedoidsOptimize = useWorkspaceStore(s => s.setKMedoidsOptimize);
  const localAspectRatio = useWorkspaceStore(s => s.localAspectRatio);

  const presetBtn = (val: typeof panelPreset, label: string) => (
    <button onClick={() => setPanelPreset(val)}
      className={`h-10 px-3 text-[13px] font-bold rounded-lg text-center border cursor-pointer transition-all ${panelPreset === val ? 'bg-orange-50 text-[#C84708] border-orange-300 shadow-sm' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>{label}</button>
  );
  const algoBtn = (val: typeof distanceAlgorithm, label: string, title: string) => (
    <button onClick={() => setDistanceAlgorithm(val)} title={title}
      className={`h-9 px-2 text-[13px] font-bold rounded-lg text-center transition-all cursor-pointer ${distanceAlgorithm === val ? 'bg-white text-[#C84708] border border-orange-200 font-extrabold shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>{label}</button>
  );

  return (
    <div className={`flex flex-col ${SECTION_GAP}`}>
      <div>
        <SectionTitle icon={<Sliders className="w-4 h-4" />}>生成图纸规格</SectionTitle>
        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-bold text-slate-500">模板画布规格 (格子数)</label>
          <div className="grid grid-cols-2 gap-2">
            {presetBtn('52x52', '52 × 52 (小)')}
            {presetBtn('78x78', '78 × 78 (中)')}
            {presetBtn('104x104', '104 × 104 (大)')}
            {presetBtn('custom', '自定义规格')}
          </div>
          {panelPreset === 'custom' && (
            <div className="flex items-center gap-2.5 mt-1 p-3 bg-slate-50/60 border border-slate-200/60 rounded-xl">
              <div className="flex-1 flex flex-col gap-1"><span className="text-[13px] text-slate-500 font-bold">宽度 (格子)</span>
                <input type="number" min="5" max="150" value={customWidth} onChange={e => setCustomWidth(parseInt(e.target.value) || 29)} className="h-9 w-full px-2.5 border border-slate-200 text-[13px] text-center font-mono rounded-lg bg-white focus:outline-indigo-400" />
              </div>
              <div className="text-slate-400 text-[13px] pt-4 font-semibold">×</div>
              <div className="flex-1 flex flex-col gap-1"><span className="text-[13px] text-slate-500 font-bold">高度 (锁比例)</span>
                <div className="h-9 w-full px-2.5 border border-slate-200/60 text-[13px] text-center font-mono rounded-lg bg-slate-100 text-slate-500 select-none font-semibold flex items-center justify-center">
                  {Math.max(1, Math.round(customWidth / (localAspectRatio || 1)))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-1">
        <div className="flex justify-between items-center">
          <span className="text-[13px] font-bold text-slate-700">限制色号数量 (色彩量化)</span>
          <span className="font-mono px-2 py-0.5 bg-orange-50 text-[#C84708] border border-orange-200 rounded-md font-bold text-[13px]">{kMedoidsOptimize ? colorLimitLocal : colorLimit} 色</span>
        </div>
        <input type="range" min="2" max="24"
          {...(kMedoidsOptimize
             ? { value: colorLimitLocal, onChange: (e: React.ChangeEvent<HTMLInputElement>) => { const v = parseInt(e.target.value); setColorLimitLocal(v); colorLimitPending.current = v; }, onMouseUp: () => { if (colorLimitPending.current !== colorLimit && setColorLimit(colorLimitPending.current) === false) { colorLimitPending.current = colorLimit; setColorLimitLocal(colorLimit); } }, onTouchEnd: () => { if (colorLimitPending.current !== colorLimit && setColorLimit(colorLimitPending.current) === false) { colorLimitPending.current = colorLimit; setColorLimitLocal(colorLimit); } } }
            : { value: colorLimit, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setColorLimit(parseInt(e.target.value)) })}
          className="w-full h-3 accent-[#E8570A] bg-stone-200 rounded-lg cursor-pointer" />
        <p className="text-[13px] text-slate-500 leading-normal">限制最终颜色数量，少则制作更简单。</p>
      </div>

      <div className={`${GROUP_BG} flex flex-col gap-3`}>
        <div className="flex justify-between items-center">
          <span className="text-[13px] font-bold text-slate-600">空间色差比对算法</span>
          <span className="font-mono text-[13px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">{distanceAlgorithm}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {algoBtn('CIEDE2000', 'CIEDE2000 (精细)', '国际照明委员会推荐的最精确感知色差计算公式')}
          {algoBtn('CIE94', 'CIE94 (感知)', '图形艺术及纺织工业标准')}
          {algoBtn('CIE76', 'CIE76 (常规)', '经典 CIE L*a*b* 空间欧氏距离')}
          {algoBtn('WeightedRGB', '红均加权 (RGB)', '人眼波长敏感度动态加权')}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-700">智能选色优化 (k-medoids)</span>
            <span className="text-[13px] text-slate-500 leading-normal mt-0.5">以量化误差最小为准则精选色号；渐变/照片类色彩还原更均衡。</span>
          </div>
          <Toggle on={kMedoidsOptimize} onClick={() => setKMedoidsOptimize(!kMedoidsOptimize)} />
        </div>
      </div>
    </div>
  );
}

export function AdjustSection() {
  const brightness = useWorkspaceStore(s => s.brightness);
  const setBrightness = useWorkspaceStore(s => s.setBrightness);
  const contrast = useWorkspaceStore(s => s.contrast);
  const setContrast = useWorkspaceStore(s => s.setContrast);
  const saturation = useWorkspaceStore(s => s.saturation);
  const setSaturation = useWorkspaceStore(s => s.setSaturation);
  const removeBackground = useWorkspaceStore(s => s.removeBackground);
  const setRemoveBackground = useWorkspaceStore(s => s.setRemoveBackground);

  return (
    <div className={`flex flex-col ${SECTION_GAP}`}>
      <div>
        <SectionTitle icon={<Sliders className="w-4 h-4" />}>图像与色彩调节</SectionTitle>
        <div className="flex flex-col gap-3">
          <AdjustSlider label="亮度" value={brightness} onRelease={setBrightness} />
          <AdjustSlider label="对比度" value={contrast} onRelease={setContrast} />
          <AdjustSlider label="饱和度" value={saturation} onRelease={setSaturation} />
        </div>
      </div>
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-bold text-slate-700">自动过滤白色/浅色背景</span>
          <Toggle on={removeBackground} onClick={() => setRemoveBackground(!removeBackground)} />
        </div>
        <p className="text-[13px] text-slate-500 leading-normal">智能识别灰度接近纯白的浅色底背景像素。</p>
      </div>
    </div>
  );
}

export function TrimSection() {
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

  return (
    <div className={`flex flex-col ${SECTION_GAP}`}>
      <div>
        <SectionTitle icon={<Crop className="w-4 h-4" />}>裁边修整</SectionTitle>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-bold text-slate-700">裁边修整</span>
          <div className="flex gap-2">
            <button onClick={() => autoDetectTrim(gridWidth, gridHeight)} className="h-8 px-2.5 text-[13px] font-bold rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer">自动裁剪</button>
            <button onClick={() => applyTrim(gridWidth, gridHeight)} className={`h-8 px-2.5 text-[13px] font-bold rounded-lg transition-colors cursor-pointer ${topTrim+bottomTrim+leftTrim+rightTrim === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'}`} disabled={topTrim+bottomTrim+leftTrim+rightTrim === 0}>应用</button>
          </div>
        </div>
        <p className="text-[13px] text-slate-500 leading-normal mb-3">拖动滑块预览裁切效果，点击「应用」确认。</p>
        {([
          ['上', topTrim, setTopTrim, Math.floor(gridHeight/2)] as const,
          ['下', bottomTrim, setBottomTrim, Math.floor(gridHeight/2)] as const,
          ['左', leftTrim, setLeftTrim, Math.floor(gridWidth/2)] as const,
          ['右', rightTrim, setRightTrim, Math.floor(gridWidth/2)] as const,
        ]).map(([label, val, set, max]) => (
          <div key={label} className="flex items-center gap-2.5 mb-2">
            <span className="text-[13px] font-mono font-bold text-slate-500 w-5">{label}</span>
            <input type="range" min="0" max={max} value={val} onChange={e => set(parseInt(e.target.value))} className="flex-1 h-2.5 accent-[#E8570A] bg-slate-200 rounded-lg cursor-pointer" />
            <span className="text-[13px] font-mono font-bold text-slate-500 w-5 text-right">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiSection({ onTriggerEnhance }: { onTriggerEnhance: () => void }) {
  const isAiEnhancing = useWorkspaceStore(s => s.isAiEnhancing);
  const aiEnhanceError = useWorkspaceStore(s => s.aiEnhanceError);
  const aiEnhanceOptions = useWorkspaceStore(s => s.aiEnhanceOptions);
  const setAiEnhanceOptions = useWorkspaceStore(s => s.setAiEnhanceOptions);
  const aiEnhancedImage = useWorkspaceStore(s => s.aiEnhancedImage);
  const setAiEnhancedImage = useWorkspaceStore(s => s.setAiEnhancedImage);

  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  useEffect(() => { checkEnhanceConfigured().then(setHasApiKey); }, []);

  return (
    <div className={`flex flex-col ${SECTION_GAP}`}>
      <SectionTitle icon={<Wand2 className="w-4 h-4" />}>AI 图像增强</SectionTitle>
      {!hasApiKey && (
        <p className="text-[13px] text-amber-600 leading-normal flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>服务器未配置 Pollinations API Key。请在 Vercel 项目设置的 Environment Variables 中添加 <code className="font-mono bg-amber-50 px-1 rounded">POLLINATIONS_API_KEY</code>。</span>
        </p>
      )}
      {hasApiKey && (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-bold text-slate-500">简化强度</span>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['light', '轻度', '保留细节'],
                ['medium', '中度', '适度简化'],
                ['strong', '强烈', '极致简化'],
              ] as const).map(([val, label, desc]) => (
                <button
                  key={val}
                  onClick={() => setAiEnhanceOptions({ enhanceStrength: val })}
                   className={`flex flex-col items-center py-2 text-[13px] font-bold rounded-lg border transition-all cursor-pointer ${aiEnhanceOptions.enhanceStrength === val ? 'bg-orange-50 text-[#C84708] border-orange-300' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                >
                  <span>{label}</span>
                  <span className="text-[11px] font-normal text-slate-500 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-bold text-slate-500">增强效果选项</span>
            {([
              ['flatColors', '扁平化颜色', '去除渐变，转为均匀色块'],
              ['cartoonStyle', '卡通风格', '简化细节，矢量画风'],
            ] as const).map(([key, label, desc]) => (
              <label key={key} className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={aiEnhanceOptions[key]}
                  onChange={() => setAiEnhanceOptions({ [key]: !aiEnhanceOptions[key] })}
                  className="mt-0.5 w-4 h-4 accent-indigo-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-slate-700">{label}</span>
                  <span className="text-[13px] text-slate-500 leading-normal">{desc}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-slate-500">自定义 prompt（可选）</span>
            <textarea
              value={aiEnhanceOptions.customPrompt}
              onChange={e => setAiEnhanceOptions({ customPrompt: e.target.value })}
              placeholder="追加到默认 prompt 末尾，例如：anime style, vibrant colors"
              rows={2}
              className="w-full p-2.5 border border-slate-200 text-[13px] rounded-lg bg-white focus:outline-indigo-400 resize-none font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerEnhance}
              disabled={isAiEnhancing}
              className={`flex-1 flex items-center justify-center gap-1.5 h-10 text-[13px] font-bold rounded-xl transition-all cursor-pointer ${isAiEnhancing ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-[#E8570A] text-white hover:bg-[#CF4707]'}`}
            >
              {isAiEnhancing ? <><Loader2 className="w-4 h-4 animate-spin" />增强中…</> : <><Wand2 className="w-4 h-4" />{aiEnhancedImage ? '重新增强' : 'AI 增强'}</>}
            </button>
            {aiEnhancedImage && !isAiEnhancing && (
              <button
                onClick={() => { if (!useWorkspaceStore.getState().hasManualEdits || window.confirm('清除 AI 增强会重新生成图纸并覆盖当前手工编辑，是否继续？')) setAiEnhancedImage(null); }}
                title="清除增强结果，使用原图"
                className="flex items-center justify-center gap-1.5 h-10 px-3 text-[13px] font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />清除
              </button>
            )}
          </div>
          {!isAiEnhancing && aiEnhanceError && (
            <div className="flex items-start gap-2 text-[13px] text-rose-600 font-bold">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="leading-normal">{aiEnhanceError}</span>
            </div>
          )}
          {aiEnhancedImage && !isAiEnhancing && (
            <div className="flex items-center gap-2 text-[13px] text-emerald-600 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>增强完成</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ViewSection() {
  const scale = useWorkspaceStore(s => s.scale);
  const setScale = useWorkspaceStore(s => s.setScale);
  const showNumbers = useWorkspaceStore(s => s.showNumbers);
  const setShowNumbers = useWorkspaceStore(s => s.setShowNumbers);
  const showRulers = useWorkspaceStore(s => s.showRulers);
  const setShowRulers = useWorkspaceStore(s => s.setShowRulers);

  return (
    <div className={`flex flex-col ${SECTION_GAP}`}>
      <SectionTitle icon={<Layers className="w-4 h-4" />}>视图网格交互</SectionTitle>
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[13px] font-bold text-slate-600">格子缩放像素</span>
          <span className="font-mono font-bold text-[#E8570A] text-[13px]">{scale}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(Math.max(8, scale - 2))} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"><ZoomOut className="w-4 h-4" /></button>
          <input type="range" min="8" max="32" step="1" value={scale} onChange={e => setScale(parseInt(e.target.value))} className="flex-1 accent-[#E8570A] h-2.5 bg-stone-200 rounded-lg cursor-pointer" />
          <button onClick={() => setScale(Math.min(32, scale + 2))} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"><ZoomIn className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-slate-700 font-bold flex items-center gap-1.5"><Grid3X3 className="w-4 h-4 text-slate-400" /> 显示行号列号</span>
          <Toggle on={showRulers} onClick={() => setShowRulers(!showRulers)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-slate-700 font-bold flex items-center gap-1.5"><Hash className="w-4 h-4 text-slate-400" /> 格子色号标识</span>
          <button onClick={() => setShowNumbers(!showNumbers)} disabled={scale < 12 && !showNumbers} title={scale < 12 ? '请拉大网格尺寸以开启色号' : ''} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${showNumbers ? 'bg-[#E8570A]' : 'bg-stone-300'} ${scale < 12 && !showNumbers ? 'opacity-40 cursor-not-allowed' : ''}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showNumbers ? 'translate-x-6' : 'translate-x-1'}`} /></button>
        </div>
      </div>
      {scale < 17 && <p className="text-[13px] text-slate-500 leading-tight">当前缩放较小 ({scale}px)，色号仅在选中/悬停时显示；放大到 120% 以上可全部显示。</p>}
    </div>
  );
}
