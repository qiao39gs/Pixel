import { useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { clearDraft, ProjectSettings, saveDraft, updateProject } from '../utils/projectStorage';
import { AspectRatio } from '../utils/constants';

function getSettings(): ProjectSettings {
  const s = useWorkspaceStore.getState();
  return {
    colorLimit: s.colorLimit,
    distanceAlgorithm: s.distanceAlgorithm,
    removeBackground: s.removeBackground,
    brightness: s.brightness,
    contrast: s.contrast,
    saturation: s.saturation,
    panelPreset: s.panelPreset,
    customWidth: s.customWidth,
    kMedoidsOptimize: s.kMedoidsOptimize,
  };
}

export function confirmDiscardChanges(message = '当前项目有未保存的修改，继续将放弃这些修改。是否继续？'): boolean {
  return !useWorkspaceStore.getState().isDirty || window.confirm(message);
}

export function useProjectSafety(croppedImageDataUrl: string | null, aspectRatio: AspectRatio) {
  const isDirty = useWorkspaceStore(s => s.isDirty);
  const transformedPixels = useWorkspaceStore(s => s.transformedPixels);
  const stats = useWorkspaceStore(s => s.stats);
  const gridWidth = useWorkspaceStore(s => s.gridWidthActual);
  const gridHeight = useWorkspaceStore(s => s.gridHeightActual);
  const currentProjectId = useWorkspaceStore(s => s.currentProjectId);
  const currentProjectName = useWorkspaceStore(s => s.currentProjectName);
  const pipelineMode = useWorkspaceStore(s => s.pipelineMode);
  const pushToast = useWorkspaceStore(s => s.pushToast);
  const requestProjectSaveName = useWorkspaceStore(s => s.requestProjectSaveName);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!useWorkspaceStore.getState().isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    if (!isDirty || transformedPixels.length === 0) return;
    const timer = window.setTimeout(() => {
      saveDraft(transformedPixels, gridWidth, gridHeight, stats, getSettings(), pipelineMode === 'skipAndHold' ? undefined : croppedImageDataUrl ?? undefined, aspectRatio, currentProjectId, currentProjectName)
        .catch(() => pushToast('自动恢复草稿保存失败'));
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [isDirty, transformedPixels, stats, gridWidth, gridHeight, croppedImageDataUrl, aspectRatio, currentProjectId, currentProjectName, pipelineMode, pushToast]);

  useEffect(() => {
    const onSave = async (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      const s = useWorkspaceStore.getState();
      if (!s.currentProjectId) {
        requestProjectSaveName();
        return;
      }
      if (!s.isDirty) { pushToast('当前项目已是最新'); return; }
      s.setSaveStatus('saving');
      try {
        const meta = await updateProject(s.currentProjectId, s.transformedPixels, s.gridWidthActual, s.gridHeightActual, s.stats, getSettings(), s.pipelineMode === 'skipAndHold' ? undefined : croppedImageDataUrl ?? undefined, aspectRatio);
        if (!meta) throw new Error('项目不存在');
        s.markSaved(meta.id, meta.name);
        await clearDraft();
        pushToast('项目已保存');
      } catch {
        s.setSaveStatus('error');
        pushToast('保存失败，请导出 JSON 备份');
      }
    };
    window.addEventListener('keydown', onSave);
    return () => window.removeEventListener('keydown', onSave);
  }, [aspectRatio, croppedImageDataUrl, pushToast, requestProjectSaveName]);
}
