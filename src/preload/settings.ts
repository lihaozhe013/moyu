import { contextBridge, ipcRenderer } from 'electron';
import type { SettingsAPI } from '../shared/ipc';
import type { SettingsDraft, SettingsSaveResult, SettingsSnapshot } from '../shared/types';

const IPC_CHANNELS = {
  settingsGetSnapshot: 'settings:get-snapshot',
  settingsSave: 'settings:save',
  settingsSetCaptureMode: 'settings:set-capture-mode',
  settingsSetWindowDragMode: 'settings:set-window-drag-mode',
  settingsClose: 'settings:close',
  settingsSaveRequested: 'settings:save-requested',
  settingsCloseRequested: 'settings:close-requested',
  settingsDismissRequested: 'settings:dismiss-requested',
  windowDragModeChanged: 'window:drag-mode-changed',
} as const;

const settingsApi: SettingsAPI = {
  settings: {
    getSnapshot: () =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsGetSnapshot) as Promise<SettingsSnapshot>,
    save: (draft: SettingsDraft) =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsSave, draft) as Promise<SettingsSaveResult>,
    setCaptureMode: (active: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsSetCaptureMode, { active }) as Promise<void>,
    setWindowDragMode: (active: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsSetWindowDragMode, {
        active,
      }) as Promise<boolean>,
    onWindowDragModeChanged: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, active: unknown): void => {
        if (typeof active === 'boolean') {
          listener(active);
        }
      };
      ipcRenderer.on(IPC_CHANNELS.windowDragModeChanged, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.windowDragModeChanged, handler);
    },
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
