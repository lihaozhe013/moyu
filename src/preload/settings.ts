import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type SettingsAPI } from '../shared/ipc';
import type { SettingsDraft, SettingsSaveResult, SettingsSnapshot } from '../shared/types';

const settingsApi: SettingsAPI = {
  settings: {
    getSnapshot: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGetSnapshot) as Promise<SettingsSnapshot>,
    save: (draft: SettingsDraft) =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsSave, draft) as Promise<SettingsSaveResult>,
    setCaptureMode: (active: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsSetCaptureMode, { active }) as Promise<void>,
    close: () => ipcRenderer.invoke(IPC_CHANNELS.settingsClose) as Promise<void>,
    onSaveRequest: (listener) => {
      const handler = (): void => listener();
      ipcRenderer.on(IPC_CHANNELS.settingsSaveRequested, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.settingsSaveRequested, handler);
    },
    onCloseRequest: (listener) => {
      const handler = (): void => listener();
      ipcRenderer.on(IPC_CHANNELS.settingsCloseRequested, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.settingsCloseRequested, handler);
    },
    onDismissRequest: (listener) => {
      const handler = (): void => listener();
      ipcRenderer.on(IPC_CHANNELS.settingsDismissRequested, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.settingsDismissRequested, handler);
    },
  },
};

contextBridge.exposeInMainWorld('settingsAPI', settingsApi);
