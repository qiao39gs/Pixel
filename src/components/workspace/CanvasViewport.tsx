import React, { useEffect, useMemo, useCallback } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { PointerInteraction } from '../../utils/pointerInteraction';

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function CanvasViewport({ canvasRef, containerRef }: Props) {
  const editMode = useWorkspaceStore(s => s.editMode);
  const dragMode = useWorkspaceStore(s => s.dragMode);
  const setDragMode = useWorkspaceStore(s => s.setDragMode);
  const brushBead = useWorkspaceStore(s => s.brushBead);
  const isEraser = useWorkspaceStore(s => s.isEraser);
  const wandMode = useWorkspaceStore(s => s.wandMode);
  const wandSelection = useWorkspaceStore(s => s.wandSelection);
  const selectedCell = useWorkspaceStore(s => s.selectedCell);
  const isProcessing = useWorkspaceStore(s => s.isProcessing);
  const isPanning = useWorkspaceStore(s => s.isPanning);
  const panOffset = useWorkspaceStore(s => s.panOffset);
  const panStart = useWorkspaceStore(s => s.panStart);
  const showRulers = useWorkspaceStore(s => s.showRulers);
  const scale = useWorkspaceStore(s => s.scale);
  const setScale = useWorkspaceStore(s => s.setScale);
  const setPanOffset = useWorkspaceStore(s => s.setPanOffset);
  const setPanStart = useWorkspaceStore(s => s.setPanStart);
  const setIsPanning = useWorkspaceStore(s => s.setIsPanning);
  const setBrushBead = useWorkspaceStore(s => s.setBrushBead);
  const setIsEraser = useWorkspaceStore(s => s.setIsEraser);
  const setSelectedCell = useWorkspaceStore(s => s.setSelectedCell);
  const setWandSelection = useWorkspaceStore(s => s.setWandSelection);
  const applyBrush = useWorkspaceStore(s => s.applyBrush);
  const applyWandFill = useWorkspaceStore(s => s.applyWandFill);
  const pushUndo = useWorkspaceStore(s => s.pushUndo);
  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const leftTrim = useWorkspaceStore(s => s.leftTrim);
  const topTrim = useWorkspaceStore(s => s.topTrim);
  const rightTrim = useWorkspaceStore(s => s.rightTrim);
  const bottomTrim = useWorkspaceStore(s => s.bottomTrim);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);

  const coordToGrid = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    const rulerSize = showRulers ? 32 : 0;
    const mx = (clientX - rect.left) * sx - rulerSize;
    const my = (clientY - rect.top) * sy - rulerSize;
    const gx = Math.floor(mx / scale) + leftTrim, gy = Math.floor(my / scale) + topTrim;
    if (gx < leftTrim || gx >= gridWidth - rightTrim || gy < topTrim || gy >= gridHeight - bottomTrim) return null;
    return { x: gx, y: gy };
  }, [canvasRef, showRulers, scale, leftTrim, topTrim, rightTrim, bottomTrim, gridWidth, gridHeight]);

  const interaction = useMemo(() => new PointerInteraction({
    editMode, dragMode, brushBead, isEraser, wandMode,
    transformedPixels, gridWidth, gridHeight, scale, panOffset, isPanning, panStart,
    coordToGrid,
    setBrushBead, setIsEraser, setSelectedCell, setWandSelection,
    setIsPanning, setPanStart, setPanOffset, setScale,
    applyBrush, applyWandFill, pushUndo,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useEffect(() => {
    interaction.updateCtx({
      editMode, dragMode, brushBead, isEraser, wandMode,
      transformedPixels, gridWidth, gridHeight, scale, panOffset, isPanning, panStart,
      coordToGrid,
    });
  }, [interaction, editMode, dragMode, brushBead, isEraser, wandMode, transformedPixels, gridWidth, gridHeight, scale, panOffset, isPanning, panStart, coordToGrid]);

  useEffect(() => () => interaction.destroy(), [interaction]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      interaction.onWheel(e, el.getBoundingClientRect());
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, interaction]);

  // 静默引用 wandSelection/selectedCell，保持未来扩展顺手——避免变量未用告警
  void wandSelection; void selectedCell;

  const resetView = useCallback(() => {
    const el = containerRef.current;
    if (!el || gridWidth <= 0 || gridHeight <= 0) return;
    const rect = el.getBoundingClientRect();
    const availW = rect.width - 32;
    const availH = rect.height - 32;
    const rulerSize = showRulers ? 32 : 0;
    const fitW = Math.floor((availW - rulerSize) / gridWidth);
    const fitH = Math.floor((availH - rulerSize) / gridHeight);
    const fit = Math.max(4, Math.min(32, Math.min(fitW, fitH)));
    setScale(fit);
    setPanOffset({ x: 0, y: 0 });
  }, [containerRef, showRulers, gridWidth, gridHeight, setScale, setPanOffset]);

  // 自动适配：grid 变化时重新填满视口
  useEffect(() => { resetView(); }, [resetView]);

  // 监听来自 ZoomControls 的"还原视图"事件
  useEffect(() => {
    const handler = () => resetView();
    window.addEventListener('pixel:reset-view', handler);
    return () => window.removeEventListener('pixel:reset-view', handler);
  }, [resetView]);

  // 退出编辑模式时清拖拽状态
  useEffect(() => { if (!editMode) setDragMode(false); }, [editMode, setDragMode]);

  return (
    <div className="absolute inset-0 bg-[#09090B] flex flex-col overflow-hidden pt-12">
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-hidden flex items-center justify-center relative bg-[#09090B] p-4 touch-none select-none"
        style={{ cursor: (editMode && !dragMode) ? 'crosshair' : 'grab' }}
        onMouseDown={(e) => interaction.onMouseDown(e)}
        onMouseMove={(e) => interaction.onMouseMove(e)}
        onMouseUp={() => interaction.onMouseUp()}
        onMouseLeave={() => interaction.onMouseUp()}
        onTouchStart={(e) => interaction.onTouchStart(e)}
        onTouchMove={(e) => interaction.onTouchMove(e)}
        onTouchEnd={() => interaction.onTouchEnd()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isProcessing && (
          <div className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 select-none">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-300">图纸高精转换与色卡量化中...</span>
          </div>
        )}
        <div className="relative transition-transform duration-75 origin-center" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
          <canvas ref={canvasRef} className="block shadow-2xl rounded-md border border-white/[0.08]" />
        </div>
      </div>
    </div>
  );
}