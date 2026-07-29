import React, { useEffect, useRef, useState } from 'react';
import { FileUp, FolderOpen, Grid3X3, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { AspectRatio } from '../utils/constants';
import {
  clearDraft,
  getAllProjects,
  importProjectFromJson,
  loadProjectData,
  ProjectMeta,
} from '../utils/projectStorage';

interface Props {
  onOpenWorkspace: (image: string | null, aspectRatio: AspectRatio) => void;
}

export default function HomeProjectActions({ onOpenWorkspace }: Props) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [showProjects, setShowProjects] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [width, setWidth] = useState(52);
  const [height, setHeight] = useState(52);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getAllProjects()
      .then(items => { if (active) setProjects(items); })
      .catch(() => { if (active) setMessage('本机项目库读取失败'); });
    return () => { active = false; };
  }, []);

  const handleLoad = async (id: string) => {
    setBusy(`load:${id}`);
    setMessage('');
    try {
      const data = await loadProjectData(id);
      if (!data) throw new Error('项目不存在');
      useWorkspaceStore.getState().loadProject(
        data.pixels,
        data.meta.gridWidth,
        data.meta.gridHeight,
        data.stats,
        data.settings,
        !!data.originalImage,
        data.meta.id,
        data.meta.name,
      );
      await clearDraft();
      onOpenWorkspace(data.originalImage ?? null, data.aspectRatio ?? 'auto');
    } catch {
      setMessage('项目打开失败，请重试');
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy('import');
    setMessage('');
    try {
      const data = await importProjectFromJson(file);
      if (!data) {
        setMessage('文件格式无效或项目数据不完整');
        return;
      }
      useWorkspaceStore.getState().loadProject(
        data.pixels,
        data.gridWidth,
        data.gridHeight,
        data.stats,
        data.settings,
        !!data.originalImage,
        undefined,
        data.name,
      );
      useWorkspaceStore.setState({ isDirty: true, saveStatus: 'idle' });
      await clearDraft();
      onOpenWorkspace(data.originalImage ?? null, data.aspectRatio ?? 'auto');
    } catch {
      setMessage('项目导入失败，请检查文件');
    } finally {
      setBusy(null);
      event.target.value = '';
    }
  };

  const handleCreateBlank = () => {
    const safeWidth = Math.min(150, Math.max(5, Math.round(width || 52)));
    const safeHeight = Math.min(150, Math.max(5, Math.round(height || 52)));
    setWidth(safeWidth);
    setHeight(safeHeight);
    useWorkspaceStore.getState().createBlankProject(safeWidth, safeHeight);
    clearDraft().catch(() => {});
    onOpenWorkspace(null, 'auto');
  };

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-orange-100 bg-[#FFFDF8] text-[#18181B] shadow-xl shadow-stone-300/25">
      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        <div className="relative p-5 sm:p-7">
          <div className="absolute right-5 top-5 grid grid-cols-4 gap-1 opacity-30" aria-hidden="true">
            {Array.from({ length: 16 }, (_, index) => <span key={index} className={`h-2.5 w-2.5 rounded-[2px] ${index === 6 || index === 9 ? 'bg-[#E8570A]' : 'bg-orange-200'}`} />)}
          </div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-orange-400">Project desk</p>
          <h2 className="font-display text-xl font-bold tracking-tight">继续已有图纸</h2>
          <p className="mt-2 max-w-md text-xs leading-5 text-stone-500">打开保存在当前浏览器中的项目，或导入此前导出的 JSON 项目文件。</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setShowProjects(value => !value)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 text-sm font-bold text-zinc-900 shadow-sm transition-colors hover:bg-orange-50 cursor-pointer"
            >
              <FolderOpen className="h-4 w-4 text-[#E8570A]" />
              本机项目库
              <span className="font-mono text-[10px] text-zinc-400">{projects.length}</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy === 'import'}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-bold text-stone-700 transition-colors hover:border-orange-200 hover:bg-orange-50 disabled:cursor-wait cursor-pointer"
            >
              {busy === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4 text-orange-400" />}
              导入 JSON
            </button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
          </div>
          {message ? <p role="alert" className="mt-3 text-xs text-[#C74708]">{message}</p> : null}
        </div>

        <div className="border-t border-orange-100 bg-orange-50/60 p-5 sm:p-7 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-orange-400" />
            <h2 className="font-display text-base font-bold">新建空画布</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-500">不需要原图，直接从透明网格开始绘制。</p>
          <div className="mt-4 flex items-end gap-2">
            <label className="min-w-0 flex-1 text-[11px] text-stone-500">
              宽度
              <input type="number" min="5" max="150" value={width} onChange={event => setWidth(Number(event.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 font-mono text-sm text-stone-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </label>
            <span className="pb-3 font-mono text-xs text-stone-400">×</span>
            <label className="min-w-0 flex-1 text-[11px] text-stone-500">
              高度
              <input type="number" min="5" max="150" value={height} onChange={event => setHeight(Number(event.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 font-mono text-sm text-stone-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </label>
            <button type="button" onClick={handleCreateBlank} className="h-11 shrink-0 rounded-xl bg-[#E8570A] px-4 text-xs font-bold text-white transition-colors hover:bg-[#CF4707] cursor-pointer">创建</button>
          </div>
          <p className="mt-2 font-mono text-[10px] text-stone-400">5–150 格，默认 52 × 52</p>
        </div>
      </div>

      {showProjects ? (
        <div className="border-t border-orange-100 bg-white/70 p-3 sm:p-4">
          {projects.length === 0 ? (
            <p className="py-4 text-center text-xs text-stone-400">当前浏览器中还没有保存的项目</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-stone-200 bg-white">
              {projects.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleLoad(project.id)}
                  disabled={busy !== null}
                  className={`group flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-orange-50/70 disabled:cursor-wait ${index > 0 ? 'border-t border-stone-100' : ''}`}
                >
                  <span className="h-11 w-11 shrink-0 rounded-lg border border-stone-200 bg-stone-50 bg-cover bg-center" style={{ backgroundImage: project.thumbnail ? `url(${project.thumbnail})` : undefined }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-stone-700">{project.name}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-stone-400">{project.gridWidth} × {project.gridHeight} · {project.colorCount} 色 · {project.updatedAt}</span>
                  </span>
                  {busy === `load:${project.id}` ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" /> : <span className="text-xs font-bold text-orange-400 group-hover:text-orange-300">打开</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
