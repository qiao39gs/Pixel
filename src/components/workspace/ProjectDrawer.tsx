import React from 'react';
import { FolderKanban } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import ProjectPanel from './ProjectPanel';
import { AspectRatio } from '../../utils/constants';
import PanelHeader from './PanelHeader';

interface Props {
  croppedImageDataUrl: string | null;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onRestoreImage: (image: string | null, ar: AspectRatio) => void;
}

export default function ProjectDrawer({ croppedImageDataUrl, aspectRatio, onRestoreImage }: Props) {
  const open = useWorkspaceStore(s => s.projectPanelOpen);
  const toggle = useWorkspaceStore(s => s.toggleProjectPanel);
  if (!open) return null;

  return (
    <aside className="editor-side-panel editor-project-panel glass-panel animate-drawer-left" aria-label="项目管理">
      <PanelHeader icon={<FolderKanban className="h-4 w-4" />} title="项目管理" description="保存、打开与备份图纸" onClose={toggle} closeLabel="关闭项目管理" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
        <ProjectPanel croppedImageDataUrl={croppedImageDataUrl} aspectRatio={aspectRatio} onRestoreImage={onRestoreImage} />
      </div>
    </aside>
  );
}
