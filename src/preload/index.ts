import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type DesktopAPI } from '../shared/ipc';

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
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.contentGetState),
    onStateChange: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, state: unknown): void => {
        if (typeof state !== 'object' || state === null || !('type' in state)) {
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
};

contextBridge.exposeInMainWorld('desktopAPI', desktopApi);
