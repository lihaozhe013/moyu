import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopAPI } from '../shared/ipc';
import type { ContentStatus, GpuDiagnostics } from '../shared/types';

const IPC_CHANNELS = {
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowToggleFullscreen: 'window:toggle-fullscreen',
  windowGetState: 'window:get-state',
  contentReload: 'content:reload',
  contentHardReload: 'content:hard-reload',
  contentSetZoomFactor: 'content:set-zoom-factor',
  contentGetZoomFactor: 'content:get-zoom-factor',
  contentZoomChanged: 'content:zoom-changed',
  contentGetState: 'content:get-state',
  contentStateChanged: 'content:state-changed',
  layoutSetContentBounds: 'layout:set-content-bounds',
  commandPaletteOpen: 'command-palette:open',
  commandPaletteClose: 'command-palette:close',
  commandsGetSummaries: 'commands:get-summaries',
  commandsExecute: 'commands:execute',
  shellSetOverlayVisible: 'shell:set-overlay-visible',
  diagnosticsGetGpu: 'diagnostics:get-gpu',
} as const;

function isContentStatus(value: unknown): value is ContentStatus {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false;
  }
  const candidate = value as { type?: unknown; code?: unknown; description?: unknown };
  if (candidate.type === 'idle' || candidate.type === 'loading' || candidate.type === 'ready') {
    return true;
  }
  if (candidate.type === 'crashed') {
    return true;
  }
  return (
    candidate.type === 'error' &&
    typeof candidate.code === 'number' &&
    Number.isFinite(candidate.code) &&
    typeof candidate.description === 'string'
  );
}

function isFiniteZoomFactor(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.5 && value <= 2;
}

function isGpuDiagnostics(value: unknown): value is GpuDiagnostics {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<GpuDiagnostics>;
  return (
    typeof candidate.appVersion === 'string' &&
    typeof candidate.electronVersion === 'string' &&
    typeof candidate.chromiumVersion === 'string' &&
    typeof candidate.nodeVersion === 'string' &&
    typeof candidate.platform === 'string' &&
    typeof candidate.architecture === 'string' &&
    Array.isArray(candidate.scaleFactors) &&
    candidate.scaleFactors.every(
      (factor) => typeof factor === 'number' && Number.isFinite(factor) && factor > 0,
    ) &&
    typeof candidate.featureStatus === 'object' &&
    candidate.featureStatus !== null &&
    Object.values(candidate.featureStatus).every((status) => typeof status === 'string')
  );
}

const desktopApi: DesktopAPI = {
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
    toggleMaximize: () => ipcRenderer.invoke(IPC_CHANNELS.windowToggleMaximize),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose),
    toggleFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.windowToggleFullscreen),
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.windowGetState),
  },
  content: {
    reload: () => ipcRenderer.invoke(IPC_CHANNELS.contentReload),
    hardReload: () => ipcRenderer.invoke(IPC_CHANNELS.contentHardReload),
    setZoomFactor: (factor) => ipcRenderer.invoke(IPC_CHANNELS.contentSetZoomFactor, { factor }),
    getZoomFactor: () => ipcRenderer.invoke(IPC_CHANNELS.contentGetZoomFactor),
    onZoomChange: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, factor: unknown): void => {
        if (isFiniteZoomFactor(factor)) {
          listener(factor);
        }
      };
      ipcRenderer.on(IPC_CHANNELS.contentZoomChanged, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.contentZoomChanged, handler);
    },
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.contentGetState),
    onStateChange: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, state: unknown): void => {
        if (!isContentStatus(state)) {
          return;
        }
        listener(state as Parameters<typeof listener>[0]);
      };
      ipcRenderer.on(IPC_CHANNELS.contentStateChanged, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.contentStateChanged, handler);
    },
  },
  layout: {
    setContentBounds: (bounds) => ipcRenderer.invoke(IPC_CHANNELS.layoutSetContentBounds, bounds),
  },
  diagnostics: {
    getGpuDiagnostics: async () => {
      const result: unknown = await ipcRenderer.invoke(IPC_CHANNELS.diagnosticsGetGpu);
      if (!isGpuDiagnostics(result)) {
        throw new Error('GPU diagnostics response is invalid.');
      }
      return result;
    },
  },
  commands: {
    getSummaries: () => ipcRenderer.invoke(IPC_CHANNELS.commandsGetSummaries),
    execute: (commandId) => ipcRenderer.invoke(IPC_CHANNELS.commandsExecute, commandId),
    setOverlayVisible: (visible) =>
      ipcRenderer.invoke(IPC_CHANNELS.shellSetOverlayVisible, visible),
    onPaletteOpen: (listener) => {
      const handler = (): void => listener();
      ipcRenderer.on(IPC_CHANNELS.commandPaletteOpen, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.commandPaletteOpen, handler);
    },
    onPaletteClose: (listener) => {
      const handler = (): void => listener();
      ipcRenderer.on(IPC_CHANNELS.commandPaletteClose, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.commandPaletteClose, handler);
    },
  },
};

contextBridge.exposeInMainWorld('desktopAPI', desktopApi);
