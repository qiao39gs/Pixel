import React, { useState, useRef, useEffect } from 'react';
import { FolderKanban, Upload, Download, Trash2, Plus, FileDown, FileUp, Pencil } from 'lucide-react';
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
} from '../../utils/projectStorage';

interface Props {
  onReset: () => void;
  croppedImageDataUrl: string;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'auto';
  onRestoreImage: (image: string, aspectRatio: '1:1' | '4:3' | 'auto') => void;
}

export default function ProjectPanel({ onReset, croppedImageDataUrl, aspectRatio, onRestoreImage }: Props) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');

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
  const mobileTab = useWorkspaceStore(s => s.mobileTab);

  useEffect(() => {
    setProjects(getAllProjects());
  }, []);

  const refreshProjects = () => setProjects(getAllProjects());

  const getSettings = (): ProjectData['settings'] => ({
    colorLimit, distanceAlgorithm, removeBackground, brightness, contrast, saturation, panelPreset, customWidth, kMedoidsOptimize,
  });

  const handleSave = () => {
    if (currentProjectId) {
      updateProject(currentProjectId, transformedPixels, gridWidth, gridHeight, stats, getSettings(), croppedImageDataUrl, aspectRatio);
      setShowSaveInput(false);
      setSaveName('');
      refreshProjects();
      return;
    }
    const name = saveName.trim() || `未命名项目 ${new Date().toLocaleString('zh-CN')}`;
    saveProject(name, transformedPixels, gridWidth, gridHeight, stats, getSettings(), croppedImageDataUrl, aspectRatio);
    setShowSaveInput(false);
    setSaveName('');
    refreshProjects();
  };

  const handleNewProject = () => {
    onReset();
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    if (id === currentProjectId) useWorkspaceStore.setState({ currentProjectId: null });
    refreshProjects();
  };

  const safeAspectRatio = (v?: string): '1:1' | '4:3' | 'auto' => {
    if (v === '1:1' || v === '4:3' || v === 'auto') return v;
    return 'auto';
  };

  const handleLoad = (id: string) => {
    const data = loadProjectData(id);
    if (data) {
      const hasImg = !!data.originalImage;
      loadProject(data.pixels, data.meta.gridWidth, data.meta.gridHeight, data.stats, data.settings, hasImg, id);
      if (hasImg) onRestoreImage(data.originalImage!, safeAspectRatio(data.aspectRatio));
    }
  };

  const handleExport = () => {
    exportProjectAsJson('像素拼豆项目', transformedPixels, gridWidth, gridHeight, stats, getSettings(), croppedImageDataUrl, aspectRatio);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importProjectFromJson(file).then(data => {
      if (data) {
        const hasImg = !!data.originalImage;
        loadProject(data.pixels, data.gridWidth, data.gridHeight, data.stats, data.settings, hasImg);
        if (hasImg) onRestoreImage(data.originalImage!, safeAspectRatio(data.aspectRatio));
      } else {
        alert('文件格式无效，请检查 JSON 文件内容。');
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartRename = (id: string, name: string) => {
    setRenamingId(id);
    setRenameName(name);
  };

  const handleConfirmRename = () => {
    if (renamingId && renameName.trim()) {
      renameProject(renamingId, renameName.trim());
      refreshProjects();
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
    <div className={`bg-white rounded-3xl border border-black/[0.04] p-6 shadow-sm ${mobileTab !== 'stats' ? 'hidden lg:block' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <FolderKanban className="w-4 h-4 text-[#E8570A]" />
        <span className="text-sm font-bold text-zinc-700">项目</span>
        <span className="text-xs text-zinc-400">{projects.length} 个</span>
      </div>
      <span className="block text-xs text-zinc-400 mt-1 mb-5">保存、加载及导入/导出 JSON 项目文件</span>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 mb-5">
        <button
          onClick={handleNewProject}
          className="px-3 py-2.5 text-xs font-bold rounded-xl bg-[#E8570A] hover:bg-[#D0440A] text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full"
        >
          <Plus className="w-3.5 h-3.5" />新建项目
        </button>
        {hasCurrentPixels && (
          <button
            onClick={() => currentProjectId ? handleSave() : setShowSaveInput(!showSaveInput)}
            className="px-3 py-2.5 text-xs font-bold rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full"
          >
            <FileDown className="w-3.5 h-3.5" />{currentProjectId ? '更新当前' : '保存当前'}
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2.5 text-xs font-bold rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full"
        >
          <FileUp className="w-3.5 h-3.5" />导入 JSON
        </button>
        {hasCurrentPixels && (
          <button
            onClick={handleExport}
            className="px-3 py-2.5 text-xs font-bold rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full"
          >
            <Download className="w-3.5 h-3.5" />导出 JSON
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
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
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-200 rounded-2xl">
          <FolderKanban className="w-10 h-10 mb-3 text-zinc-300" />
          <span className="text-sm font-medium text-zinc-400">暂无保存的项目</span>
          <span className="text-xs text-zinc-400 mt-1">点击"新建项目"或"导入 JSON"</span>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <div className="max-h-[420px] overflow-y-auto">
            {projects.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 p-3 hover:bg-zinc-50 transition-colors group ${renamingId === p.id ? '' : 'cursor-pointer'} ${idx !== 0 ? 'border-t border-zinc-100' : ''}`}
                onClick={() => { if (renamingId !== p.id) handleLoad(p.id); }}
              >
                <div
                  className="w-12 h-12 rounded-lg border border-zinc-200 bg-zinc-100 flex-shrink-0 overflow-hidden"
                  style={{
                    backgroundImage: p.thumbnail ? `url(${p.thumbnail})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="flex-1 min-w-0">
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
                      className="w-full px-2 py-1 text-sm font-bold bg-white border border-[#E8570A] rounded-lg text-zinc-700 outline-none"
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <>
                      <div className="text-sm font-bold text-zinc-700 truncate">{p.name}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-zinc-400">{p.createdAt}</span>
                        <span className="text-xs font-mono text-zinc-400">{p.gridWidth}×{p.gridHeight} · {p.colorCount}色</span>
                      </div>
                    </>
                  )}
                </div>
                {renamingId !== p.id && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartRename(p.id, p.name); }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                      title="重命名"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLoad(p.id); }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#E8570A]/10 text-[#E8570A] hover:bg-[#E8570A]/20 transition-colors cursor-pointer"
                    >
                      加载
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
