import React, { useState, useRef, useEffect } from 'react';
import { FolderKanban, Download, Trash2, Plus, FileDown, FileUp, Pencil, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import {
  ProjectMeta,
  ProjectData,
  saveProject,
  updateProject,
  deleteProject,
  loadProjectData,
  getAllProjects,
  exportProjectAsJson,
  importProjectFromJson,
  renameProject,
  clearDraft,
} from '../../utils/projectStorage';
import { confirmDiscardChanges } from '../../hooks/useProjectSafety';
import { AspectRatio } from '../../utils/constants';

interface Props {
  onReset: () => void;
  croppedImageDataUrl: string | null;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onRestoreImage: (image: string | null, aspectRatio: AspectRatio) => void;
}

export default function ProjectPanel({ onReset, croppedImageDataUrl, aspectRatio, onRestoreImage }: Props) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>('list');

  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);
  const stats = useWorkspaceStore(s => s.stats);
  const colorLimit = useWorkspaceStore(s => s.colorLimit);
  const distanceAlgorithm = useWorkspaceStore(s => s.distanceAlgorithm);
  const kMedoidsOptimize = useWorkspaceStore(s => s.kMedoidsOptimize);
  const removeBackground = useWorkspaceStore(s => s.removeBackground);
  const brightness = useWorkspaceStore(s => s.brightness);
  const contrast = useWorkspaceStore(s => s.contrast);
  const saturation = useWorkspaceStore(s => s.saturation);
  const panelPreset = useWorkspaceStore(s => s.panelPreset);
  const customWidth = useWorkspaceStore(s => s.customWidth);
  const loadProject = useWorkspaceStore(s => s.loadProject);
  const currentProjectId = useWorkspaceStore(s => s.currentProjectId);
  const currentProjectName = useWorkspaceStore(s => s.currentProjectName);
  const isDirty = useWorkspaceStore(s => s.isDirty);
  const saveStatus = useWorkspaceStore(s => s.saveStatus);
  const pipelineMode = useWorkspaceStore(s => s.pipelineMode);
  const lastSavedAt = useWorkspaceStore(s => s.lastSavedAt);
  const markSaved = useWorkspaceStore(s => s.markSaved);
  const setSaveStatus = useWorkspaceStore(s => s.setSaveStatus);
  const clearCurrentProject = useWorkspaceStore(s => s.clearCurrentProject);
  const pushToast = useWorkspaceStore(s => s.pushToast);

  useEffect(() => {
    refreshProjects();
  }, []);

  const refreshProjects = async () => {
    try { setProjects(await getAllProjects()); }
    catch { pushToast('项目列表读取失败'); }
    finally { setBusyAction(null); }
  };

  const getSettings = (): ProjectData['settings'] => ({
    colorLimit, distanceAlgorithm, removeBackground, brightness, contrast, saturation, panelPreset, customWidth, kMedoidsOptimize,
  });
  const sourceImage = pipelineMode === 'skipAndHold' ? undefined : croppedImageDataUrl ?? undefined;

  const handleSave = async () => {
    setBusyAction('save');
    setSaveStatus('saving');
    try {
      if (currentProjectId) {
        const meta = await updateProject(currentProjectId, transformedPixels, gridWidth, gridHeight, stats, getSettings(), sourceImage, aspectRatio);
        if (!meta) throw new Error('项目不存在');
        markSaved(meta.id, meta.name);
        await clearDraft();
        pushToast('项目已更新');
      } else {
        const name = saveName.trim() || `未命名项目 ${new Date().toLocaleString('zh-CN')}`;
        const meta = await saveProject(name, transformedPixels, gridWidth, gridHeight, stats, getSettings(), sourceImage, aspectRatio);
        markSaved(meta.id, meta.name);
        await clearDraft();
        pushToast('项目已保存到本机');
      }
      setShowSaveInput(false);
      setSaveName('');
      await refreshProjects();
    } catch {
      setSaveStatus('error');
      pushToast('保存失败，请导出 JSON 备份');
    } finally {
      setBusyAction(null);
    }
  };

  const handleNewProject = () => {
    if (!confirmDiscardChanges('当前项目有未保存的修改。新建项目将放弃这些修改，是否继续？')) return;
    clearCurrentProject();
    clearDraft().catch(() => {});
    onReset();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定删除项目“${name}”吗？此操作无法撤销。`)) return;
    setBusyAction(`delete:${id}`);
    try {
      await deleteProject(id);
      if (id === currentProjectId) useWorkspaceStore.setState({ currentProjectId: null, currentProjectName: null, isDirty: transformedPixels.length > 0, saveStatus: 'idle', lastSavedAt: null });
      await refreshProjects();
      pushToast('项目已删除');
    } catch { pushToast('删除项目失败'); }
    finally { setBusyAction(null); }
  };

  const handleLoad = async (id: string) => {
    if (id === currentProjectId && !isDirty) { pushToast('当前已打开此项目'); return; }
    if (!confirmDiscardChanges('当前项目有未保存的修改。加载其他项目将放弃这些修改，是否继续？')) return;
    setBusyAction(`load:${id}`);
    try {
      const data = await loadProjectData(id);
      if (!data) throw new Error('项目不存在');
      const hasImg = !!data.originalImage;
      loadProject(data.pixels, data.meta.gridWidth, data.meta.gridHeight, data.stats, data.settings, hasImg, id, data.meta.name);
      onRestoreImage(data.originalImage ?? null, data.aspectRatio ?? 'auto');
      await clearDraft();
      pushToast(hasImg ? '项目已加载' : '已加载仅图纸项目，生成参数不可重新计算');
    } catch { pushToast('项目加载失败'); }
    finally { setBusyAction(null); }
  };

  const handleExport = () => {
    exportProjectAsJson(currentProjectName || '像素拼豆项目', transformedPixels, gridWidth, gridHeight, stats, getSettings(), sourceImage, aspectRatio);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirmDiscardChanges('导入项目将替换当前未保存的修改，是否继续？')) { e.target.value = ''; return; }
    setBusyAction('import');
    try {
      const data = await importProjectFromJson(file);
      if (data) {
        const hasImg = !!data.originalImage;
        loadProject(data.pixels, data.gridWidth, data.gridHeight, data.stats, data.settings, hasImg, undefined, data.name);
        useWorkspaceStore.setState({ isDirty: true, saveStatus: 'idle' });
        onRestoreImage(data.originalImage ?? null, data.aspectRatio ?? 'auto');
        pushToast('项目已导入，请保存到项目库');
      } else {
        pushToast('文件格式无效或项目数据不完整');
      }
    } catch { pushToast('项目导入失败'); }
    finally { setBusyAction(null); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartRename = (id: string, name: string) => {
    setRenamingId(id);
    setRenameName(name);
  };

  const handleConfirmRename = async () => {
    if (renamingId && renameName.trim()) {
      const meta = await renameProject(renamingId, renameName.trim());
      if (meta && meta.id === currentProjectId) useWorkspaceStore.setState({ currentProjectName: meta.name });
      await refreshProjects();
      pushToast(meta ? '项目已重命名' : '重命名失败');
    }
    setRenamingId(null);
    setRenameName('');
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameName('');
  };

  const hasCurrentPixels = transformedPixels.length > 0;

  return (
    <div className="bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="min-w-0 truncate pr-3 text-xs text-stone-500">项目存于本地</span>
        <span className="shrink-0 whitespace-nowrap px-2 py-1 rounded-full bg-stone-100 text-[11px] font-mono text-stone-500">{projects.length} 个</span>
      </div>

      {hasCurrentPixels && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-white/70 px-3 py-2.5">
          {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 text-[#E8570A] animate-spin" /> : saveStatus === 'error' ? <AlertCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className={`w-4 h-4 ${isDirty ? 'text-amber-500' : 'text-emerald-500'}`} />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-stone-700">{currentProjectName || '未命名项目'}</div>
            <div className="text-[11px] text-stone-400">{saveStatus === 'saving' ? '正在保存…' : saveStatus === 'error' ? '保存失败' : isDirty ? '有未保存修改 · Ctrl/⌘ + S' : lastSavedAt ? `${lastSavedAt} 已保存` : currentProjectId ? '已保存' : '尚未保存'}</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-2 mb-5">
        <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleNewProject}
          className="px-3 py-2.5 text-xs font-bold rounded-xl bg-[#E8570A] hover:bg-[#CF4707] text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full"
        >
          <Plus className="w-3.5 h-3.5" />新建项目
        </button>
        {hasCurrentPixels && (
          <button
            onClick={() => currentProjectId ? handleSave() : setShowSaveInput(!showSaveInput)}
            disabled={busyAction === 'save' || (!!currentProjectId && !isDirty)}
            className="px-3 py-2.5 text-xs font-bold rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full"
          >
            {busyAction === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}{currentProjectId ? '更新当前' : '保存当前'}
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2.5 text-xs font-bold rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full"
        >
          <FileUp className="w-3.5 h-3.5" />导入 JSON
        </button>
        {hasCurrentPixels && (
          <button
            onClick={handleExport}
            className="px-3 py-2.5 text-xs font-bold rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full"
          >
            <Download className="w-3.5 h-3.5" />导出 JSON
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {/* Save name input */}
      {showSaveInput && (
        <div className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex gap-2">
          <input
            type="text"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder="输入项目名称..."
            className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#E8570A]/50 transition-colors"
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            autoFocus
          />
          <button onClick={handleSave} className="px-4 py-2 text-xs font-bold rounded-lg bg-[#E8570A] hover:bg-[#D0440A] text-white transition-colors cursor-pointer">保存</button>
          <button onClick={() => { setShowSaveInput(false); setSaveName(''); }} className="px-4 py-2 text-xs font-bold rounded-lg bg-zinc-200 text-zinc-600 hover:bg-zinc-300 transition-colors cursor-pointer">取消</button>
        </div>
      )}

      {/* Project list */}
      {busyAction === 'list' ? (
        <div className="flex items-center justify-center py-12 border border-zinc-200 rounded-2xl">
          <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
          <span className="ml-2 text-xs text-stone-400">正在读取项目库…</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-200 rounded-2xl">
          <FolderKanban className="w-10 h-10 mb-3 text-zinc-300" />
          <span className="text-sm font-medium text-zinc-400">暂无保存的项目</span>
          <span className="text-xs text-zinc-400 mt-1">点击"新建项目"或"导入 JSON"</span>
        </div>
      ) : (
        <div className="max-h-[460px] overflow-y-auto pr-1 scrollbar-dark">
          <div className="flex flex-col gap-2.5">
            {projects.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border p-3 transition-colors ${p.id === currentProjectId ? 'border-orange-200 bg-orange-50/70' : 'border-stone-200 bg-white/70 hover:border-stone-300 hover:bg-white'}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
                    style={{
                      backgroundImage: p.thumbnail ? `url(${p.thumbnail})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="min-w-0 flex-1 pt-0.5">
                    {renamingId === p.id ? (
                      <input
                        type="text"
                        value={renameName}
                        onChange={e => setRenameName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleConfirmRename();
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        onBlur={handleConfirmRename}
                        className="w-full rounded-lg border border-[#E8570A] bg-white px-2 py-1 text-sm font-bold text-zinc-700 outline-none"
                        autoFocus
                      />
                    ) : (
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="truncate text-sm font-bold text-zinc-700">{p.name}</div>
                        {p.id === currentProjectId ? <span className="shrink-0 rounded-full bg-[#E8570A] px-1.5 py-0.5 text-[9px] font-bold text-white">当前</span> : null}
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-stone-500">{p.gridWidth} × {p.gridHeight}</span>
                      <span>{p.colorCount} 色</span>
                      {!p.hasOriginalImage ? <span className="text-amber-600">仅图纸</span> : null}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center border-t border-stone-100 pt-2.5">
                  <span className="min-w-0 flex-1 truncate pr-2 text-[10px] text-stone-400">{p.updatedAt || p.createdAt}</span>
                  {renamingId !== p.id ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => handleStartRename(p.id, p.name)}
                        className="flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />重命名
                      </button>
                      <button
                        onClick={() => handleLoad(p.id)}
                        disabled={busyAction === `load:${p.id}`}
                        className="h-8 rounded-lg bg-[#E8570A] px-3 text-[11px] font-bold text-white transition-colors hover:bg-[#CF4707] disabled:cursor-wait cursor-pointer"
                      >
                        {busyAction === `load:${p.id}` ? '打开中' : p.id === currentProjectId ? '已打开' : '打开'}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        aria-label={`删除项目 ${p.name}`}
                        title="删除项目"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
