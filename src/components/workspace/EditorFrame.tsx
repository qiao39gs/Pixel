import React, { useEffect, useRef } from 'react';
import { BeadPaletteItem, TransformedPixel, IngredientStat } from '../../types';
import CanvasViewport from './CanvasViewport';
import TopToolbar from './TopToolbar';
import LeftDrawer from './LeftDrawer';
import RightStatsPanel from './RightStatsPanel';
import ProjectDrawer from './ProjectDrawer';
import PalettePanel from './PalettePanel';
import MobileToolbar from './MobileToolbar';
import Toasts from './Toasts';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { AspectRatio } from '../../utils/constants';
import ProjectStatus from './ProjectStatus';

type Palette = Array<BeadPaletteItem & { rgb: { r: number; g: number; b: number }; lab: any }>;

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentPalette: Palette;
  onGeneratePng: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onGeneratePdf: (pixels: TransformedPixel[], w: number, h: number, stats: IngredientStat[], opts?: { showRulers: boolean; showNumbers: boolean }) => void;
  onReset: () => void;
  onTriggerEnhance: () => void;
  croppedImageDataUrl: string | null;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onRestoreImage: (image: string | null, ar: AspectRatio) => void;
}

export default function EditorFrame(props: Props) {
  const panelOpen = useWorkspaceStore(s => s.panelOpen);
  const setPanelOpen = useWorkspaceStore(s => s.setPanelOpen);
  const showPalettePanel = useWorkspaceStore(s => s.showPalettePanel);
  const leftOpen = panelOpen === 'left' || panelOpen === 'both';
  const rightOpen = panelOpen === 'right' || panelOpen === 'both';
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (window.matchMedia('(max-width: 1023px)').matches && panelOpen === 'right') {
      setPanelOpen('none');
    }
  }, [panelOpen, setPanelOpen]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const collapsePanels = (event: MediaQueryListEvent) => {
      if (event.matches && useWorkspaceStore.getState().panelOpen === 'both') setPanelOpen('right');
    };
    media.addEventListener('change', collapsePanels);
    return () => media.removeEventListener('change', collapsePanels);
  }, [setPanelOpen]);

  return (
    <div
      className="editor-shell fixed inset-0 z-40 overflow-hidden bg-[#0B0B0C] animate-fade-in"
      data-left-open={leftOpen}
      data-right-open={rightOpen}
      data-palette-open={showPalettePanel}
    >
      <main className="editor-canvas-stage">
        <CanvasViewport canvasRef={props.canvasRef} containerRef={props.containerRef} />
      </main>
      {(leftOpen || rightOpen) && <button className="editor-panel-backdrop" onClick={() => setPanelOpen('none')} aria-label="关闭侧边面板" />}
      <PalettePanel currentPalette={props.currentPalette} />
      <TopToolbar
        currentPalette={props.currentPalette}
        onGeneratePng={props.onGeneratePng}
        onGeneratePdf={props.onGeneratePdf}
        onReset={props.onReset}
      />
      <ProjectStatus />
      <LeftDrawer onTriggerEnhance={props.onTriggerEnhance} />
      <RightStatsPanel />
      <Toasts />
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
