import React from 'react';
import { X } from 'lucide-react';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  onClose: () => void;
  closeLabel: string;
}

export default function PanelHeader({ icon, title, description, onClose, closeLabel }: Props) {
  return (
    <header className="editor-panel-header">
      <div className="flex min-w-0 items-center gap-2.5 text-stone-800">
        <span className="editor-panel-header-icon">{icon}</span>
        <div className="min-w-0">
          <span className="block truncate font-sans text-sm font-bold leading-tight">{title}</span>
          <span className="mt-0.5 block truncate text-[11px] text-stone-500">{description}</span>
        </div>
      </div>
      <button onClick={onClose} className="editor-panel-close" title={closeLabel} aria-label={closeLabel}>
        <X className="h-4 w-4" />
      </button>
    </header>
  );
}
