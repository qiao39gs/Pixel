import React, { useRef, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, RotateCw, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface ImageUploaderProps {
  onImageCropped: (imageDataUrl: string) => void;
  aspectRatio: '1:1' | '4:3';
  setAspectRatio: (ratio: '1:1' | '4:3') => void;
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

  // Handle uploaded file
  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('请上传小于 10MB 的图片');
      return;
    }
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

  // Render on Cropping Canvas
  useEffect(() => {
    if (!imageSrc) return;
    
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      drawCropper();
    };
  }, [imageSrc, zoom, rotation, pan, aspectRatio]);

  const drawCropper = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We want the canvas viewport to be consistently sized (e.g., 400x400)
    const viewWidth = 400;
    const targetRatio = aspectRatio === '1:1' ? 1 : 3/4;
    const viewHeight = 400 * targetRatio;

    canvas.width = viewWidth;
    canvas.height = viewHeight;

    // Clear background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.save();
    // Center of canvas
    ctx.translate(viewWidth / 2 + pan.x, viewHeight / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate aspect match
    const imgRatio = img.width / img.height;
    let drawWidth = viewWidth;
    let drawHeight = viewWidth / imgRatio;

    if (imgRatio > 1) {
      drawHeight = viewHeight;
      drawWidth = viewHeight * imgRatio;
    }

    // Draw centering image
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Draw guideline bounds check (faint overlay of safe crop limit)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    // Highlight the borders
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(2, 2, viewWidth - 4, viewHeight - 4);
  };

  // Trigger crop finished callback
  const handleConfirmCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Export the drawn canvas area
    const croppedUrl = canvas.toDataURL('image/png');
    onImageCropped(croppedUrl);
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
            支持 10MB 以内的 JPEG/PNG 动图或日常照片。算法将自动对齐拼豆色卡体系，并生成颗粒用量预估。
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
              <span className="text-[11px] font-medium text-slate-400 mb-3 self-start flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-indigo-500" /> 按住鼠标拖拽/手指滑动可平移图片，微调视角
              </span>
              
              <div 
                ref={containerRef}
                className="relative cursor-grab active:cursor-grabbing border-4 border-white shadow-lg bg-slate-950 overflow-hidden rounded-2xl"
                style={{
                  width: '100%',
                  maxWidth: '430px',
                  touchAction: 'none'
                }}
                onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
                onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
                onMouseUp={handleEndDrag}
                onMouseLeave={handleEndDrag}
                onTouchStart={(e) => {
                  if (e.touches[0]) handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
                }}
                onTouchMove={(e) => {
                  if (e.touches[0]) handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
                }}
                onTouchEnd={handleEndDrag}
              >
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-auto block"
                />
              </div>
 
              {/* Reset layout or rotate */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="px-4 py-2 bg-white border border-slate-200/80 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" /> 顺时针旋转
                </button>
                <button
                  type="button"
                  onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); setRotation(0); }}
                  className="px-4 py-2 bg-white border border-slate-200/80 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-xs transition-all cursor-pointer"
                >
                  重置视角
                </button>
              </div>
            </div>
 
            {/* Cropper controls panel */}
            <div className="w-full md:w-64 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-500" /> 图纸比例裁切
                </h4>
                
                {/* Ratio selector */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('1:1')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === '1:1'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    1:1 正方形
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('4:3')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === '4:3'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    4:3 长方形
                  </button>
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
                      className="flex-1 accent-indigo-600 h-1.5 bg-slate-250 rounded-lg cursor-pointer"
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
