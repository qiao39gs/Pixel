import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../types';
import { BEAD_PALETTE, COLOR_GROUPS } from '../data/palette';
import { hexToRgb, rgbToLab, deltaE76, deltaE2000, deltaE94, deltaEWeightedRGB, LAB } from '../colorUtils';
import { 
  ZoomIn, ZoomOut, Check, Sliders, Hash, Grid3X3, Layers, 
  Trash2, Eye, EyeOff, LayoutGrid, Award
} from 'lucide-react';

interface PatternWorkspaceProps {
  croppedImageDataUrl: string;
  onReset: () => void;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onGeneratePng: (pixels: TransformedPixel[], width: number, height: number, stats: IngredientStat[], options?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], width: number, height: number, stats: IngredientStat[], options?: { showRulers: boolean; showNumbers: boolean }) => void;
}

export default function PatternWorkspace({
  croppedImageDataUrl,
  onReset,
  aspectRatio,
  onGeneratePng,
  onGeneratePdf
}: PatternWorkspaceProps) {
  // 1. Grid Size States
  const [panelPreset, setPanelPreset] = useState<'52x52' | '78x78' | '104x104' | 'custom'>('52x52');
  const [customWidth, setCustomWidth] = useState<number>(52);
  const [customHeight, setCustomHeight] = useState<number>(52);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);

  // Derive final grid dimensions
  const { gridWidth, gridHeight } = useMemo(() => {
    const PRESET_RATIOS: Record<string, number> = {
      '1:1': 1,
      '4:3': 3 / 4,
      '3:4': 4 / 3,
      '16:9': 9 / 16,
      '9:16': 16 / 9,
    };

    let w = 52;
    let h = 52;
    
    const computeH = (w: number) => {
      if (aspectRatio === 'auto') {
        return Math.max(1, Math.round(w / imageAspectRatio));
      }
      return Math.round(w * (PRESET_RATIOS[aspectRatio] ?? 1));
    };

    if (panelPreset === '52x52') {
      w = 52;
      h = computeH(52);
    } else if (panelPreset === '78x78') {
      w = 78;
      h = computeH(78);
    } else if (panelPreset === '104x104') {
      w = 104;
      h = computeH(104);
    } else {
      w = Math.min(150, Math.max(5, customWidth));
      h = computeH(w);
    }
    return { gridWidth: w, gridHeight: h };
  }, [panelPreset, customWidth, customHeight, aspectRatio, imageAspectRatio]);

  // 2. Algorithm States
  const [colorLimit, setColorLimit] = useState<number>(24);
  const [distanceAlgorithm, setDistanceAlgorithm] = useState<'CIEDE2000' | 'CIE94' | 'CIE76' | 'WeightedRGB'>('CIEDE2000');
  const [whiteThreshold, setWhiteThreshold] = useState<number>(10); // Alpha threshold
  const [removeBackground, setRemoveBackground] = useState<boolean>(true); // Ignore light close-to-white or transparent backgrounds

  // 3. UI Display States
  const [scale, setScale] = useState<number>(14); // Size of each grid box
  const [showNumbers, setShowNumbers] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [selectedBeadHighlight, setSelectedBeadHighlight] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Converted pixels & stats state to resolve asynchronous image loading issue
  const [transformedPixels, setTransformedPixels] = useState<TransformedPixel[]>([]);
  const [stats, setStats] = useState<IngredientStat[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Filter palette to MGB only
  const currentPalette = useMemo(() => {
    const filtered = BEAD_PALETTE.filter(item => item.brand === 'MGB');
    return filtered.map(item => {
      const rgb = hexToRgb(item.hex);
      return {
        ...item,
        rgb,
        lab: rgbToLab(rgb)
      };
    });
  }, []);

  // Transform core downsampling & matching logic (Asynchronous Image onload pipeline)
  useEffect(() => {
    if (!croppedImageDataUrl) {
      setTransformedPixels([]);
      setStats([]);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    let active = true;

    const img = new Image();
    img.src = croppedImageDataUrl;
    img.onload = () => {
      if (!active) return;

      // Compute ratio & grid locally to avoid stale closure
      const imgRatio = img.width / img.height;
      const sw = img.width;
      const sh = img.height;
      setImageAspectRatio(imgRatio);

      let gw: number, gh: number;
      if (panelPreset === '52x52') {
        gw = 52;
      } else if (panelPreset === '78x78') {
        gw = 78;
      } else if (panelPreset === '104x104') {
        gw = 104;
      } else {
        gw = Math.min(150, Math.max(5, customWidth));
      }
      const ratio = (() => {
        if (aspectRatio === 'auto') return 1 / imgRatio;
        const m: Record<string, number> = { '1:1': 1, '4:3': 3/4, '3:4': 4/3, '16:9': 9/16, '9:16': 16/9 };
        return m[aspectRatio] ?? 1;
      })();
      gh = Math.max(1, Math.round(gw * ratio));

      // Draw source image at native resolution for precise sampling
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = sw;
      srcCanvas.height = sh;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) { setIsProcessing(false); return; }
      srcCtx.drawImage(img, 0, 0);
      const srcData = srcCtx.getImageData(0, 0, sw, sh).data;

      // Step 1: Nearest-neighbor downsampling & match to palette
      // Using single-pixel sampling preserves color fidelity better than
      // area averaging, which creates intermediate blended colors that
      // increase the number of unique bead matches (noise).
      const initialMatched: TransformedPixel[] = [];
      const colorUsageCount: Record<string, number> = {};

      for (let y = 0; y < gh; y++) {
        const sy = gh > 1 ? Math.round(y * (sh - 1) / (gh - 1)) : 0;
        for (let x = 0; x < gw; x++) {
          const sx = gw > 1 ? Math.round(x * (sw - 1) / (gw - 1)) : 0;
          const offset = (sy * sw + sx) * 4;
          const r = srcData[offset];
          const g = srcData[offset + 1];
          const b = srcData[offset + 2];
          const a = srcData[offset + 3];

          // Is Transparent or White background to ignore
          const isTransparent = a < 80;
          const isSubWhite = removeBackground && (r > 245 && g > 245 && b > 245);

          if (isTransparent || isSubWhite) {
            initialMatched.push({ x, y, matchedBead: { code: "EMPTY", name: "透明背景", hex: "rgba(0,0,0,0)", brand: "MGB", series: "" } });
            continue;
          }

          // Convert RGB level to LAB Space
          const pixelLab = rgbToLab({ r, g, b });

          let bestMatch = currentPalette[0];
          let minDistance = Infinity;

          for (let i = 0; i < currentPalette.length; i++) {
            const bead = currentPalette[i];
            let dist = 0;
            if (distanceAlgorithm === 'CIEDE2000') {
              dist = deltaE2000(pixelLab, bead.lab);
            } else if (distanceAlgorithm === 'CIE94') {
              dist = deltaE94(pixelLab, bead.lab);
            } else if (distanceAlgorithm === 'CIE76') {
              dist = deltaE76(pixelLab, bead.lab);
            } else {
              dist = deltaEWeightedRGB({ r, g, b }, bead.rgb);
            }
            if (dist < minDistance) { minDistance = dist; bestMatch = bead; }
          }

          initialMatched.push({ x, y, matchedBead: bestMatch });
          if (bestMatch.code !== "EMPTY") {
            colorUsageCount[bestMatch.code] = (colorUsageCount[bestMatch.code] || 0) + 1;
          }
        }
      }

      // Step 2: Restricted Colors pass if distinct matching colors > limit limit
      const uniqueBeadsUsed = Object.keys(colorUsageCount);
      
      if (uniqueBeadsUsed.length <= colorLimit) {
        // Calculate statistics
        const statsObj: Record<string, { bead: BeadPaletteItem; count: number }> = {};
        initialMatched.forEach(p => {
          if (p.matchedBead.code !== "EMPTY") {
            const code = p.matchedBead.code;
            if (!statsObj[code]) {
              statsObj[code] = { bead: p.matchedBead, count: 0 };
            }
            statsObj[code].count++;
          }
        });

        const statsList = Object.values(statsObj).sort((a, b) => b.count - a.count);
        if (active) {
          setTransformedPixels(initialMatched);
          setStats(statsList);
          setIsProcessing(false);
        }
        return;
      }

      // Sort existing palette beads by frequency
      const topBeadCodes = Object.entries(colorUsageCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorLimit)
        .map(entry => entry[0]);

      const topBeadsPalette = currentPalette.filter(bead => topBeadCodes.includes(bead.code));

      // Phase 3: Remap every pixel ONLY to the top limit list
      const finalMatched: TransformedPixel[] = [];
      const finalStatsObj: Record<string, { bead: BeadPaletteItem; count: number }> = {};

      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const initialPixel = initialMatched[y * gw + x];

          if (initialPixel.matchedBead.code === "EMPTY") {
            finalMatched.push(initialPixel);
            continue;
          }

          // Check if its initial match is already in the allowed list
          if (topBeadCodes.includes(initialPixel.matchedBead.code)) {
            finalMatched.push(initialPixel);
            
            const code = initialPixel.matchedBead.code;
            if (!finalStatsObj[code]) {
              finalStatsObj[code] = { bead: initialPixel.matchedBead, count: 0 };
            }
            finalStatsObj[code].count++;
            continue;
          }

          // Otherwise: re-match this pixel's raw image color with only the top selection
          const sy2 = gh > 1 ? Math.round(y * (sh - 1) / (gh - 1)) : 0;
          const sx2 = gw > 1 ? Math.round(x * (sw - 1) / (gw - 1)) : 0;
          const off2 = (sy2 * sw + sx2) * 4;
          const r = srcData[off2];
          const g = srcData[off2 + 1];
          const b = srcData[off2 + 2];
          const pixelLab = rgbToLab({ r, g, b });

          let bestMatch = topBeadsPalette[0];
          let minDistance = Infinity;

          for (let i = 0; i < topBeadsPalette.length; i++) {
            const bead = topBeadsPalette[i];
            let dist = 0;
            if (distanceAlgorithm === 'CIEDE2000') {
              dist = deltaE2000(pixelLab, bead.lab);
            } else if (distanceAlgorithm === 'CIE94') {
              dist = deltaE94(pixelLab, bead.lab);
            } else if (distanceAlgorithm === 'CIE76') {
              dist = deltaE76(pixelLab, bead.lab);
            } else {
              dist = deltaEWeightedRGB({ r, g, b }, bead.rgb);
            }

            if (dist < minDistance) {
              minDistance = dist;
              bestMatch = bead;
            }
          }

          finalMatched.push({
            x,
            y,
            matchedBead: bestMatch
          });

          const code = bestMatch.code;
          if (!finalStatsObj[code]) {
            finalStatsObj[code] = { bead: bestMatch, count: 0 };
          }
          finalStatsObj[code].count++;
        }
      }

      const finalStatsList = Object.values(finalStatsObj).sort((a, b) => b.count - a.count);
      if (active) {
        setTransformedPixels(finalMatched);
        setStats(finalStatsList);
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      if (active) {
        setIsProcessing(false);
      }
    };

    return () => {
      active = false;
    };
  }, [croppedImageDataUrl, gridWidth, gridHeight, colorLimit, currentPalette, distanceAlgorithm, removeBackground]);


  // 4. Drawing Canvas View
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || transformedPixels.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate dynamic canvas dimensions based on grid parameters
    const rulerSize = showRulers ? 32 : 0;
    const gridDrawWidth = gridWidth * scale;
    const gridDrawHeight = gridHeight * scale;
    const totalWidth = gridDrawWidth + rulerSize;
    const totalHeight = gridDrawHeight + rulerSize;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // 1. Draw Checkerboard background for transparency helper
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Save context and translate to offset coordinate plane
    ctx.save();
    ctx.translate(rulerSize, rulerSize);

    // Draw little grid checkerboard for transparent areas
    const checkerSize = 8;
    for (let y = 0; y < gridDrawHeight; y += checkerSize) {
      for (let x = 0; x < gridDrawWidth; x += checkerSize) {
        if (((x / checkerSize) + (y / checkerSize)) % 2 === 0) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(x, y, checkerSize, checkerSize);
        }
      }
    }

    // 2. Render each pixel block
    transformedPixels.forEach(p => {
      const isHighlighted = selectedBeadHighlight === null || p.matchedBead.code === selectedBeadHighlight;
      const isTransparent = p.matchedBead.code === "EMPTY";

      if (isTransparent) {
        // Draw cross lines for blank empty pegs
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x * scale + scale / 2, p.y * scale + scale / 2, Math.max(2, scale / 5), 0, 2 * Math.PI);
        ctx.stroke();
        return;
      }

      // Fill matching bead color
      ctx.fillStyle = p.matchedBead.hex;
      
      // If we are highlighting another bead, dim this one
      if (!isHighlighted) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillRect(p.x * scale, p.y * scale, scale, scale);
        ctx.restore();
      } else {
        ctx.fillRect(p.x * scale, p.y * scale, scale, scale);
      }

      // Draw slight shiny 3D bead circular peg texture if cell size allows (like realistic Perler tubes!)
      if (scale >= 10 && isHighlighted) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x * scale + scale / 2, p.y * scale + scale / 2, scale / 3.2, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.arc(p.x * scale + scale / 2, p.y * scale + scale / 2, scale / 5, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }
    });

    // 3. Draw high-精 grid lines
    ctx.strokeStyle = '#cbd5e1'; // light slate grid
    ctx.lineWidth = 0.5;
    for (let x = 1; x < gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, gridDrawHeight);
      ctx.stroke();
    }
    for (let y = 1; y < gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(gridDrawWidth, y * scale);
      ctx.stroke();
    }

    // 4. Draw Anchor locator Red lines (IMPORTANT PAIN POINT: every 5 peg dashed red, every 10 solid red)
    // Vertical reference red lines
    for (let x = 1; x < gridWidth; x++) {
      if (x % 10 === 0) {
        ctx.strokeStyle = '#ef4444'; // solid bright red
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, gridDrawHeight);
        ctx.stroke();
      } else if (x % 5 === 0) {
        ctx.strokeStyle = '#f87171'; // dashed red
        ctx.lineWidth = 1.0;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, gridDrawHeight);
        ctx.stroke();
        ctx.setLineDash([]); // clear dash
      }
    }

    // Horizontal reference red lines
    for (let y = 1; y < gridHeight; y++) {
      if (y % 10 === 0) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(gridDrawWidth, y * scale);
        ctx.stroke();
      } else if (y % 5 === 0) {
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(gridDrawWidth, y * scale);
        ctx.stroke();
        ctx.setLineDash([]); // clear dash
      }
    }

    // 5. Annotate text overlay letter markers inside grid blocks
    if (showNumbers && scale >= 16) {
      transformedPixels.forEach(p => {
        if (p.matchedBead.code === "EMPTY") return;
        
        const isHighlighted = selectedBeadHighlight === null || p.matchedBead.code === selectedBeadHighlight;
        if (!isHighlighted) return;

        // Auto transition color label contrast (black or white depends on backdrop luminance)
        const hex = p.matchedBead.hex;
        const rgb = hexToRgb(hex);
        const luma = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
        ctx.fillStyle = luma > 140 ? '#0F172A' : '#FFFFFF'; // readable contrast
        
        ctx.font = `bold ${Math.floor(scale / 2.5)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(
          p.matchedBead.code,
          p.x * scale + scale / 2,
          p.y * scale + scale / 2 + 0.5
        );
      });
    }

    // 6. Annotate Row and Column Number Rulers
    if (showRulers) {
      ctx.fillStyle = '#64748B';
      ctx.font = `bold ${Math.max(9, Math.min(11, scale / 1.5))}px monospace`;

      // Column markers
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (let x = 0; x < gridWidth; x++) {
        const isColumnHeaderVisible = scale >= 14 || (x + 1) % 5 === 0 || x === 0 || x === gridWidth - 1;
        if (isColumnHeaderVisible) {
          ctx.fillText(
            (x + 1).toString(),
            x * scale + scale / 2,
            -6
          );
        }
      }

      // Row markers
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let y = 0; y < gridHeight; y++) {
        const isRowHeaderVisible = scale >= 14 || (y + 1) % 5 === 0 || y === 0 || y === gridHeight - 1;
        if (isRowHeaderVisible) {
          ctx.fillText(
            (y + 1).toString(),
            -6,
            y * scale + scale / 2
          );
        }
      }
    }

    // Restore offset transform after completion
    ctx.restore();

  }, [transformedPixels, scale, showNumbers, showRulers, selectedBeadHighlight, gridWidth, gridHeight]);

  // Handle Board Drag Navigation (Mouse Events)
  const handleStartPan = (e: React.MouseEvent) => {
    // Only drag with left click or dragging enabled
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleEndPan = () => {
    setIsPanning(false);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Dynamic parameters controlling dashboard - Bento Style */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Controls Column (Left) */}
        <div className="w-full lg:col-span-4 flex flex-col gap-5">
          <div className="bg-white rounded-3xl border border-black/[0.04] p-6 shadow-sm flex flex-col gap-5 transition-all">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-900 flex items-center gap-2 text-sm leading-none">
                <Sliders className="w-4 h-4 text-indigo-600" />
                生成图纸规格
              </h3>
              <button 
                onClick={onReset}
                className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5" /> 重选图片
              </button>
            </div>

            {/* Template Presets selector */}
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                模板画布规格 (格子数)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPanelPreset('52x52')}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl text-center border cursor-pointer transition-all ${
                    panelPreset === '52x52' 
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-500 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  52 × 52 (小)
                </button>
                <button
                  onClick={() => setPanelPreset('78x78')}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl text-center border cursor-pointer transition-all ${
                    panelPreset === '78x78' 
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-500 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  78 × 78 (中)
                </button>
                <button
                  onClick={() => setPanelPreset('104x104')}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl text-center border cursor-pointer transition-all ${
                    panelPreset === '104x104' 
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-500 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  104 × 104 (大)
                </button>
                <button
                  onClick={() => setPanelPreset('custom')}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl text-center border cursor-pointer transition-all ${
                    panelPreset === 'custom' 
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-500 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  自定义规格
                </button>
              </div>

              {panelPreset === 'custom' && (
                <div className="flex items-center gap-2.5 mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-black/[0.02]">
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">宽度 (格子)</span>
                    <input
                      type="number"
                      min="5"
                      max="150"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseInt(e.target.value) || 29)}
                      className="w-full p-1.5 border border-slate-200 text-xs text-center font-mono rounded bg-white focus:outline-indigo-500"
                    />
                  </div>
                  <div className="text-slate-400 text-xs pt-3 font-semibold">×</div>
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">高度 (锁比例)</span>
                    <div className="w-full p-1.5 border border-slate-100 text-xs text-center font-mono rounded bg-slate-100 text-slate-500 select-none font-semibold">
                      {aspectRatio === 'auto'
                        ? Math.max(1, Math.round(customWidth / imageAspectRatio))
                        : Math.round(customWidth * ({
                            '1:1': 1, '4:3': 3/4, '3:4': 4/3, '16:9': 9/16, '9:16': 16/9
                          }[aspectRatio] ?? 1))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Limit Colors slider */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">限制色号数量 (色彩量化)</span>
                <span className="font-mono px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md font-bold text-xs">{colorLimit} 色以内</span>
              </div>
              <input
                type="range"
                min="2"
                max="64"
                value={colorLimit}
                onChange={(e) => setColorLimit(parseInt(e.target.value))}
                className="w-full h-1.5 accent-indigo-600 bg-slate-200 rounded-lg cursor-pointer animate-all"
              />
              <span className="text-[10px] text-slate-400 leading-normal">限制图纸最终出现的最多拼豆颜色，数量少可大幅降低图纸制作与购买复杂度。</span>
            </div>

            {/* Advanced Algorithm math matching */}
            <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span className="font-bold text-slate-600">空间色差比对算法</span>
                <span className="font-mono text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">{distanceAlgorithm}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <button
                  onClick={() => setDistanceAlgorithm('CIEDE2000')}
                  className={`py-1.5 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                    distanceAlgorithm === 'CIEDE2000' 
                      ? 'bg-white text-indigo-600 shadow-xs border border-indigo-100 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="国际照明委员会推荐的最精确感知色差计算公式(考虑到亮度、饱和度和色调差异，以及蓝色异常偏移旋转角修正)，极其写实"
                >
                  CIEDE2000 (精细)
                </button>
                <button
                  onClick={() => setDistanceAlgorithm('CIE94')}
                  className={`py-1.5 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                    distanceAlgorithm === 'CIE94' 
                      ? 'bg-white text-indigo-600 shadow-xs border border-indigo-100 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="图形艺术及纺织工业标准，比CIEDE2000更具算力优势，且在感知上极其自然、过渡均匀"
                >
                  CIE94 (感知)
                </button>
                <button
                  onClick={() => setDistanceAlgorithm('CIE76')}
                  className={`py-1.5 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                    distanceAlgorithm === 'CIE76' 
                      ? 'bg-white text-indigo-600 shadow-xs border border-indigo-100 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="经典的 CIE L*a*b* 空间常规三维欧氏距离，算法响应极速快，但是对高饱和色匹配稍微偏激"
                >
                  CIE76 (常规)
                </button>
                <button
                  onClick={() => setDistanceAlgorithm('WeightedRGB')}
                  className={`py-1.5 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                    distanceAlgorithm === 'WeightedRGB' 
                      ? 'bg-white text-indigo-600 shadow-xs border border-indigo-100 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="针对人眼对不同颜色波长（红绿蓝通道）敏感度不一致而设计的动态加权红均算法(Red-Mean)，纯RGB流，算力开销极低"
                >
                  红均加权 (RGB)
                </button>
              </div>
            </div>
            {/* Background filtration */}
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">自动过滤白色/浅色背景</span>
                <button
                  onClick={() => setRemoveBackground(!removeBackground)}
                  className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                    removeBackground ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      removeBackground ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">开启后将智能识别灰度接近纯白的浅色底背景像素，将其设为透明并不填充任何豆子。</p>
            </div>

          </div>

          {/* Quick UI controls panel */}
          <div className="bg-white rounded-3xl border border-black/[0.04] p-5 shadow-sm flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              视图网格交互
            </h4>

            {/* Display scale */}
            <div>
              <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                <span className="font-semibold">格子缩放像素</span>
                <span className="font-mono font-bold text-indigo-600">{scale}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setScale(prev => Math.max(8, prev - 2))} 
                  className="p-1 px-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-250 transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="8"
                  max="32"
                  step="1"
                  value={scale}
                  onChange={(e) => setScale(parseInt(e.target.value))}
                  className="flex-1 accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                />
                <button 
                  onClick={() => setScale(prev => Math.min(32, prev + 2))} 
                  className="p-1 px-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-250 transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Toggle code markers inside grid cells */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 font-semibold flex items-center gap-1">
                  <Grid3X3 className="w-3.5 h-3.5 text-slate-400" /> 预览与导出显示行号列号
                </span>
                <button
                  onClick={() => setShowRulers(!showRulers)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                    showRulers ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      showRulers ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 font-semibold flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" /> 图纸格子覆盖色号标识
                </span>
                <button
                  onClick={() => setShowNumbers(!showNumbers)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                    showNumbers ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                  disabled={scale < 12}
                  title={scale < 12 ? '请拉大网格显示尺寸以开启色号' : ''}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      showNumbers ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            {scale < 16 && showNumbers && (
              <p className="text-[10px] text-amber-600 leading-tight">提示: 网格渲染尺寸较小 (当前 {scale}px)，图纸中可能会无法看清标记，建议调拉高上方网格尺寸。</p>
            )}
          </div>
        </div>

        {/* Workspace Canvas (Right) */}
        <div className="w-full lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-950 border border-[#1D1D21] rounded-3xl p-6 shadow-2xl flex flex-col relative overflow-hidden min-h-[500px] transition-all">
            {/* Header controls for Board */}
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4 pb-3 border-b border-white/[0.04] z-10">
              <div className="flex items-center gap-2 text-white">
                <span className="text-xs font-bold px-2.5 py-1 bg-white/[0.06] border border-white/[0.04] rounded-lg text-slate-300 font-mono">
                  {gridWidth} × {gridHeight} 画幅规格
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  ( 最终已精准出数: <strong className="text-indigo-400">{stats.length} 色</strong> )
                </span>
              </div>
              
              {/* Interactive highlight filter state detail */}
              {selectedBeadHighlight && (
                <div className="flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-xl text-indigo-400 text-xs">
                  <span className="font-bold">聚焦高亮色号: {selectedBeadHighlight}</span>
                  <button 
                    onClick={() => setSelectedBeadHighlight(null)} 
                    className="hover:text-white font-bold ml-1 font-mono hover:scale-110 cursor-pointer"
                  >
                     × 清除
                  </button>
                </div>
              )}
            </div>

            {/* Drag scrollable Viewport container */}
            <div 
              ref={containerRef}
              className="flex-1 w-full overflow-hidden flex items-center justify-center relative cursor-grab active:cursor-grabbing border-2 border-dashed border-white/[0.06] rounded-2xl bg-[#09090B] p-4 group"
              style={{ minHeight: '380px' }}
              onMouseDown={handleStartPan}
              onMouseMove={handlePanMove}
              onMouseUp={handleEndPan}
              onMouseLeave={handleEndPan}
            >
              {isProcessing && (
                <div className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 rounded-2xl select-none">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold text-slate-300">图纸高精转换与色卡量化中...</span>
                </div>
              )}

              <div 
                className="relative transition-transform duration-75 origin-center"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                }}
              >
                <canvas 
                  ref={canvasRef} 
                  className="block shadow-2xl rounded-md border border-white/[0.08]"
                />
              </div>

              {/* Viewport instruction overlay */}
              <div className="absolute bottom-3 left-3 flex gap-2 text-[10px] text-slate-500 bg-white/70 px-3 py-1 rounded-lg border border-slate-200/50 backdrop-blur-sm select-none shadow-sm">
                <span>按住鼠标左键可平移拖拽</span>
                <span>·</span>
                <span>画布完全支持大尺寸缩放</span>
              </div>
            </div>

            {/* Quick Export Panel buttons */}
            <div className="grid grid-cols-2 gap-3.5 mt-5 z-10">
              <button
                onClick={() => onGeneratePng(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers })}
                className="py-3.5 px-4 bg-white/[0.05] hover:bg-white/[0.08] active:scale-98 border border-white/[0.05] text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 font-display"
              >
                <LayoutGrid className="w-4 h-4 text-emerald-400" />
                导出高清拼豆图纸 (PNG)
              </button>
              <button
                onClick={() => onGeneratePdf(transformedPixels, gridWidth, gridHeight, stats, { showRulers, showNumbers })}
                className="py-3.5 px-4 bg-gradient-to-tr from-indigo-600 via-indigo-650 to-violet-650 hover:brightness-105 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 shadow-lg shadow-indigo-950/20 font-display"
              >
                <Award className="w-4 h-4" />
                导出 A4 打印标准 PDF
              </button>
            </div>
          </div>

          {/* Real inventory stats widget */}
          <div className="bg-white rounded-3xl border border-black/[0.04] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-3.5 border-b border-slate-100 mb-5 gap-3">
              <div className="flex flex-col">
                <h3 className="font-display font-bold text-[#1D1D1F] text-sm flex items-center gap-2 leading-none">
                  <Grid3X3 className="w-4 h-4 text-indigo-500" />
                  MARD 标准色卡
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold mt-1 font-mono uppercase tracking-wider">
                  材料总用量: <strong className="text-slate-800">{transformedPixels.filter(p => p.matchedBead.code !== "EMPTY").length} 颗</strong>
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold md:text-right">
                点按下方颜色小块，可快速在上方画布中 <span className="text-indigo-600">聚焦高亮显示</span>
              </div>
            </div>

            {/* Grouped by series */}
            {COLOR_GROUPS.map(group => {
              const seriesStats = stats.filter(s => s.bead.series === group.series);
              if (seriesStats.length === 0) return null;

              return (
                <div key={group.series} className="mb-5">
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {group.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {seriesStats.reduce((sum, s) => sum + s.count, 0)} 颗 · {seriesStats.length} 色
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {seriesStats.map((statItem) => {
                      const isSelected = selectedBeadHighlight === statItem.bead.code;
                      const packs = (statItem.count / 1000).toFixed(1);

                      return (
                        <div
                          key={statItem.bead.code}
                          onClick={() => setSelectedBeadHighlight(isSelected ? null : statItem.bead.code)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-50/20 shadow-xs' 
                              : 'border-slate-100 hover:bg-slate-50 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-full shadow-inner border border-black/[0.04] flex items-center justify-center font-mono font-bold text-[10px]"
                              style={{ 
                                backgroundColor: statItem.bead.hex,
                                color: (statItem.bead.hex === '#FFFFFF' || statItem.bead.hex === '#F5F5F5' || statItem.bead.hex === '#FFE0B2') ? '#334155' : '#FFFFFF'
                              }}
                            >
                              {statItem.bead.code}
                            </div>

                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-xs leading-none">
                                {statItem.bead.name}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                #{statItem.bead.code}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-display font-extrabold text-slate-800 text-xs">
                              {statItem.count} <span className="text-[10px] font-normal text-slate-400 font-sans">颗</span>
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 font-mono font-semibold">
                              ~{packs} 包
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
