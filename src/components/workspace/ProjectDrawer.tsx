import React from 'react';
import { X, FolderKanban } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import ProjectPanel from './ProjectPanel';

interface Props {
  onReset: () => void;
  croppedImageDataUrl: string;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onRestoreImage: (image: string, ar: '1:1' | '4:3' | 'auto') => void;
}

export default function ProjectDrawer({ onReset, croppedImageDataUrl, aspectRatio, onRestoreImage }: Props) {
  const open = useWorkspaceStore(s => s.projectPanelOpen);
  const toggle = useWorkspaceStore(s => s.toggleProjectPanel);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={toggle} />
      <div className="relative ml-3 mt-14 mb-3 w-[92vw] max-w-[440px] max-h-[calc(100dvh-72px)] flex flex-col glass-panel rounded-3xl overflow-hidden animate-drawer-left">
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.06] shrink-0">
          <div className="flex items-center gap-1.5 text-slate-700">
            <FolderKanban className="w-4 h-4 text-[#E8570A]" />
            <span className="font-sans font-semibold text-sm">项目</span>
          </div>
          <button onClick={toggle} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
          <ProjectPanel onReset={onReset} croppedImageDataUrl={croppedImageDataUrl} aspectRatio={aspectRatio} onRestoreImage={onRestoreImage} />
        </div>
      </div>
    </div>
  );
}