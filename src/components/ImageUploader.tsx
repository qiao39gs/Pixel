import React, { useRef, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, RotateCw, ZoomIn, ZoomOut, Move } from 'lucide-react';

type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';

const PRESET_RATIOS: Record<string, number> = {
  '1:1': 1,
  '4:3': 3 / 4,
  '3:4': 4 / 3,
  '16:9': 9 / 16,
  '9:16': 16 / 9,
};

interface ImageUploaderProps {
  onImageCropped: (imageDataUrl: string) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
}

export default function ImageUploader({ onImageCropped, aspectRatio, setAspectRatio }: ImageUploaderProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);

  // Handle uploaded file
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('仅支持上传图片类型文件（PNG/JPEG）');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setImageSrc(e.target.result);
        // Reset transform state
        setZoom(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // 1. Separate HTMLImageElement loading from render cycles (Massive Performance Booster!)
  useEffect(() => {
    if (!imageSrc) {
      imageRef.current = null;
      setImgLoaded(false);
      return;
    }
    
    setImgLoaded(false);
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImgLoaded(true);
      // 默认使用原图片比例
      setAspectRatio('auto');
    };
  }, [imageSrc]);

  // Redraw canvas on any transform state changes
  useEffect(() => {
    if (imgLoaded) {
      drawCropper();
    }
  }, [imgLoaded, zoom, rotation, pan, aspectRatio]);

  const drawCropper = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas viewport sized to aspect ratio
    const viewWidth = 400;
    let viewHeight: number;
    if (aspectRatio === 'auto') {
      const imgRatio = img.width / img.height;
      viewHeight = Math.round(viewWidth / imgRatio);
    } else {
      viewHeight = Math.round(viewWidth * (PRESET_RATIOS[aspectRatio] ?? 1));
    }

    canvas.width = viewWidth;
    canvas.height = viewHeight;

    // Clear background (transparent — let container show through for display,
    // and preserve alpha for downstream transparency detection)
    ctx.clearRect(0, 0, viewWidth, viewHeight);

    ctx.save();
    // Center of canvas
    ctx.translate(viewWidth / 2 + pan.x, viewHeight / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate aspect match
    // auto mode: snap draw dims to viewport exactly to avoid sub-pixel gaps
    // that create transparent margins and break symmetry
    const imgRatio = img.width / img.height;
    let drawWidth = viewWidth;
    let drawHeight = viewWidth / imgRatio;

    if (aspectRatio === 'auto') {
      drawWidth = viewWidth;
      drawHeight = viewHeight;
    } else if (imgRatio > 1) {
      drawHeight = viewHeight;
      drawWidth = viewHeight * imgRatio;
    }

    // Draw centering image
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // 2. Beautiful Rule of Thirds guidelines overlay (classic photographer/cropped look)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);

    ctx.beginPath();
    // Verticals
    ctx.moveTo(viewWidth / 3, 0);
    ctx.lineTo(viewWidth / 3, viewHeight);
    ctx.moveTo((viewWidth * 2) / 3, 0);
    ctx.lineTo((viewWidth * 2) / 3, viewHeight);
    // Horizontals
    ctx.moveTo(0, viewHeight / 3);
    ctx.lineTo(viewWidth, viewHeight / 3);
    ctx.moveTo(0, (viewHeight * 2) / 3);
    ctx.lineTo(viewWidth, (viewHeight * 2) / 3);
    ctx.stroke();

    // Reset line dash
    ctx.setLineDash([]);
  };

  // Auto layout fit calculators (one-click absolute comfort)
  const fitToFrame = () => {
    const img = imageRef.current;
    if (!img) return;
    
    const viewWidth = 400;
    const viewHeight = (() => {
      if (aspectRatio === 'auto') {
        return Math.round(viewWidth / (img.width / img.height));
      }
      return Math.round(viewWidth * (PRESET_RATIOS[aspectRatio] ?? 1));
    })();

    const imgRatio = img.width / img.height;
    let drawWidth = viewWidth;
    let drawHeight = viewWidth / imgRatio;

    if (aspectRatio === 'auto') {
      drawWidth = viewWidth;
      drawHeight = viewHeight;
    } else if (imgRatio > 1) {
      drawHeight = viewHeight;
      drawWidth = viewHeight * imgRatio;
    }

    const rHeight = viewHeight / drawHeight;
    const rWidth = viewWidth / drawWidth;
    
    setZoom(Math.min(rHeight, rWidth));
    setPan({ x: 0, y: 0 });
  };

  const fillFrame = () => {
    const img = imageRef.current;
    if (!img) return;

    const viewWidth = 400;
    const viewHeight = (() => {
      if (aspectRatio === 'auto') {
        return Math.round(viewWidth / (img.width / img.height));
      }
      return Math.round(viewWidth * (PRESET_RATIOS[aspectRatio] ?? 1));
    })();

    const imgRatio = img.width / img.height;
    let drawWidth = viewWidth;
    let drawHeight = viewWidth / imgRatio;

    if (aspectRatio === 'auto') {
      drawWidth = viewWidth;
      drawHeight = viewHeight;
    } else if (imgRatio > 1) {
      drawHeight = viewHeight;
      drawWidth = viewHeight * imgRatio;
    }

    const rHeight = viewHeight / drawHeight;
    const rWidth = viewWidth / drawWidth;

    setZoom(Math.max(rHeight, rWidth));
    setPan({ x: 0, y: 0 });
  };

  // Trigger crop finished callback
  const handleConfirmCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Export the drawn canvas area
    const croppedUrl = canvas.toDataURL('image/png');
    onImageCropped(croppedUrl);
  };

  // Touch Distance calculator
  const calculateTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Mouse / Touch handlers for Panning
  const handleStartDrag = (clientX: number, clientY: number) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPan({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleEndDrag = () => {
    setIsDragging(false);
  };

  // Dual-touch pinch zoom support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageSrc) return;
    if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = calculateTouchDistance(e.touches);
      setTouchStartDist(dist);
    } else if (e.touches.length === 1) {
      handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!imageSrc) return;
    if (e.touches.length === 2 && touchStartDist !== null) {
      e.preventDefault(); // Stop mobile scrolling gesture
      const currentDist = calculateTouchDistance(e.touches);
      if (currentDist > 0) {
        const factor = currentDist / touchStartDist;
        setZoom((prev) => {
          const next = prev * (factor > 1 ? 1.025 : 0.975);
          return Math.min(4.0, Math.max(0.4, next));
        });
        setTouchStartDist(currentDist);
      }
    } else if (e.touches.length === 1) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStartDist(null);
  };

  // 3. Scroll Wheel zooming with non-passive event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.min(4.0, Math.max(0.4, prev * factor)));
    };

    container.addEventListener('wheel', onWheelEvent, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheelEvent);
    };
  }, [imgLoaded]);

  // 4. Keyboard Arrow key micro-adjustments & Hotkeys support
  useEffect(() => {
    if (!imageSrc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      const step = e.shiftKey ? 20 : 5; // shift speeds up alignment

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setPan((p) => ({ ...p, y: p.y - step }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPan((p) => ({ ...p, y: p.y + step }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setPan((p) => ({ ...p, x: p.x - step }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPan((p) => ({ ...p, x: p.x + step }));
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom((prev) => Math.min(4.0, prev * 1.05));
          break;
        case '-':
        case '_':
          e.preventDefault();
          setZoom((prev) => Math.max(0.4, prev * 0.95));
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setRotation((prev) => (prev + 90) % 360);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageSrc]);

  return (
    <div className="w-full bg-white border border-black/[0.04] rounded-3xl p-6 shadow-sm overflow-hidden transition-all duration-300">
      {/* Upload area if no image selected */}
      {!imageSrc ? (
        <div 
          className={`relative p-8 md:p-14 text-center flex flex-col items-center justify-center transition-all duration-300 ${
            dragActive 
              ? 'bg-indigo-505/5 border-2 border-dashed border-indigo-500' 
              : 'bg-slate-50/50 border-2 border-dashed border-slate-200/80 hover:border-indigo-400'
          } rounded-2xl m-2 cursor-pointer`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('dropzone-file')?.click()}
        >
          <input 
            type="file" 
            id="dropzone-file" 
            className="hidden" 
            accept="image/png, image/jpeg" 
            onChange={handleFileInput} 
          />
          <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-md shadow-gray-200/50 border border-gray-100 text-slate-800 mb-5 hover:scale-110 hover:rotate-6 transition-all duration-300">
            <Upload className="h-7 w-7 text-indigo-500" />
          </div>
          <h3 className="font-display font-extrabold text-slate-900 text-lg mb-2">
            点击上传 或拖拽图片文件到这里
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
            支持 JPEG/PNG 动图或日常照片。算法将自动对齐拼豆色卡体系，并生成颗粒用量预估。
          </p>
          <span className="text-[10px] px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full font-bold border border-indigo-100/50">
            100% 浏览器本地处理 · 绝对安全保护隐私
          </span>
        </div>
      ) : (
        <div className="p-2">
          <div className="flex flex-col md:flex-row gap-8">
            
            {/* Cropper viewport */}
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/80 rounded-2xl p-4 border border-black/[0.02] overflow-hidden">
              <span className="text-[11px] font-medium text-slate-400 mb-3 self-start flex items-center gap-1.5 flex-wrap">
                <Move className="w-3.5 h-3.5 text-indigo-500" /> 
                <span>鼠标拖拽/单指平移 · 鼠标滚轮/双指捏合缩放 · 键盘方向键/快捷键微调</span>
              </span>
              
              <div 
                ref={containerRef}
                className="relative cursor-grab active:cursor-grabbing border-4 border-white shadow-xl bg-slate-950 overflow-hidden rounded-2xl"
                style={{
                  width: '100%',
                  maxWidth: '430px',
                  touchAction: 'none'
                }}
                onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
                onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
                onMouseUp={handleEndDrag}
                onMouseLeave={handleEndDrag}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-auto block"
                />
              </div>
 
              {/* Reset layout or rotate */}
              <div className="flex items-center justify-between w-full max-w-[430px] mt-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fitToFrame}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-[11px] font-bold rounded-lg text-slate-700 hover:text-indigo-600 hover:border-indigo-100 transition-all cursor-pointer shadow-xs"
                    title="缩放图像使其完全放入选区内"
                  >
                    完全贴合
                  </button>
                  <button
                    type="button"
                    onClick={fillFrame}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-[11px] font-bold rounded-lg text-slate-700 hover:text-indigo-600 hover:border-indigo-100 transition-all cursor-pointer shadow-xs"
                    title="缩放图像使其完全填满整个选区"
                  >
                    填满画布
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-[11px] font-bold rounded-lg text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" /> 旋转 90°
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); setRotation(0); }}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-[11px] font-bold rounded-lg text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                    title="重置缩放坐标与旋转"
                  >
                    初始重置
                  </button>
                </div>
              </div>
            </div>
 
            {/* Cropper controls panel */}
            <div className="w-full md:w-64 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-500" /> 图纸比例裁切
                </h4>
                
                {/* Ratio selector */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <button type="button" onClick={() => setAspectRatio('1:1')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === '1:1' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}>1:1</button>
                  <button type="button" onClick={() => setAspectRatio('4:3')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === '4:3' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}>4:3</button>
                  <button type="button" onClick={() => setAspectRatio('3:4')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === '3:4' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}>3:4</button>
                  <button type="button" onClick={() => setAspectRatio('16:9')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === '16:9' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}>16:9</button>
                  <button type="button" onClick={() => setAspectRatio('9:16')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === '9:16' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}>9:16</button>
                  <button type="button" onClick={() => setAspectRatio('auto')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === 'auto' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}>原图</button>
                </div>
 
                {/* Zoom regulation */}
                <div className="mb-6">
                  <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-slate-700">局部缩放</span>
                    <span className="font-mono font-bold text-indigo-600">{Math.round(zoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.max(0.4, prev - 0.15))}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min="0.4"
                      max="4.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.min(4.0, prev + 0.15))}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Keyboard Shortcuts cheat sheet for pro look */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-500 leading-normal flex flex-col gap-1">
                  <div className="font-bold text-slate-700 uppercase tracking-wider mb-1">键盘快捷面板</div>
                  <div className="flex justify-between"><span>平移微调:</span> <span className="font-mono font-bold bg-white border border-slate-250 px-1 rounded">↑ ↓ ← →</span></div>
                  <div className="flex justify-between"><span>快速缩放:</span> <span className="font-mono font-bold bg-white border border-slate-250 px-1 rounded">- / +</span></div>
                  <div className="flex justify-between"><span>旋转 90°:</span> <span className="font-mono font-bold bg-white border border-slate-250 px-1 rounded">R键</span></div>
                  <div className="flex justify-between mt-1 text-slate-400"><span>加速平移:</span> <span>按住 Shift + 方向键</span></div>
                </div>
              </div>
 
              {/* Confirm / Re-upload details */}
              <div className="flex flex-col gap-2.5 mt-6 md:mt-0 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleConfirmCrop}
                  className="w-full py-3.5 px-4 bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 hover:scale-101 hover:brightness-105 duration-200 text-white font-display font-bold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 text-sm cursor-pointer"
                >
                  确定选区，导入工作台
                </button>
                <button
                  type="button"
                  onClick={() => setImageSrc(null)}
                  className="w-full py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-semibold rounded-xl text-center transition-all cursor-pointer"
                >
                  更换其他图片
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
