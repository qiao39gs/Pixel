import React from 'react';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../../types';
import CanvasViewport from './CanvasViewport';
import TopToolbar from './TopToolbar';
import LeftDrawer from './LeftDrawer';
import RightStatsPanel from './RightStatsPanel';
import ProjectDrawer from './ProjectDrawer';
import PalettePanel from './PalettePanel';
import ZoomControls from './ZoomControls';
import MobileToolbar from './MobileToolbar';

type Palette = Array<BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: any }>;

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentPalette: Palette;
  onGeneratePng: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onReset: () => void;
  onTriggerEnhance: () => void;
  croppedImageDataUrl: string;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onRestoreImage: (image: string, ar: '1:1' | '4:3' | 'auto') => void;
}

export default function EditorFrame(props: Props) {
  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-[#09090B] flex flex-col animate-fade-in">
      <CanvasViewport canvasRef={props.canvasRef} containerRef={props.containerRef} />
      <PalettePanel currentPalette={props.currentPalette} />
      <TopToolbar
        currentPalette={props.currentPalette}
        onGeneratePng={props.onGeneratePng}
        onGeneratePdf={props.onGeneratePdf}
        onReset={props.onReset}
      />
      <LeftDrawer onTriggerEnhance={props.onTriggerEnhance} />
      <RightStatsPanel />
      <ZoomControls />
      <MobileToolbar currentPalette={props.currentPalette} />
      <ProjectDrawer
        onReset={props.onReset}
        croppedImageDataUrl={props.croppedImageDataUrl}
        aspectRatio={props.aspectRatio}
        onRestoreImage={props.onRestoreImage}
      />
    </div>
  );
}