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
    reload: async () => {
      throw new Error('The content surface is not initialized.');
    },
    hardReload: async () => {
      throw new Error('The content surface is not initialized.');
    },
    setZoomFactor: (factor) => ipcRenderer.invoke(IPC_CHANNELS.contentSetZoomFactor, { factor }),
    getState: async () => ({ type: 'idle' }),
  },
  layout: {
    setContentBounds: async () => undefined,
  },
};

contextBridge.exposeInMainWorld('desktopAPI', desktopApi);
