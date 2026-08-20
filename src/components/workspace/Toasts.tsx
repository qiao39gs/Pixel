import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';

export default function Toasts() {
  const toasts = useWorkspaceStore(s => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="glass-dark rounded-xl px-4 py-2 text-[13px] font-bold text-slate-100 animate-panel-pop shadow-lg">
          {t.msg}
        </div>
      ))}
    </div>
  );
}