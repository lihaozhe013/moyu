import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from './channels';
import type { SettingsSaveResult, SettingsSnapshot } from '../../shared/types';

export interface SettingsIpcDependencies {
  readonly getWindow: () => BrowserWindow | null;
  readonly getSnapshot: () => SettingsSnapshot;
  readonly saveSettings: (input: unknown) => Promise<SettingsSaveResult>;
  readonly setCaptureMode: (active: boolean) => void;
}

function requireSettingsSender(
  event: IpcMainInvokeEvent,
  settingsWindow: BrowserWindow,
): BrowserWindow {
  if (
    settingsWindow.isDestroyed() ||
    event.sender !== settingsWindow.webContents ||
    event.senderFrame !== settingsWindow.webContents.mainFrame
  ) {
    throw new Error('IPC sender is not the local settings window.');
  }
  return settingsWindow;
}

function isCapturePayload(input: unknown): input is { readonly active: boolean } {
  return (
    typeof input === 'object' &&
    input !== null &&
    Object.keys(input).length === 1 &&
    typeof (input as { active?: unknown }).active === 'boolean'
  );
}

export function registerSettingsIpcHandlers(dependencies: SettingsIpcDependencies): () => void {
  ipcMain.handle(IPC_CHANNELS.settingsGetSnapshot, (event) => {
    const settingsWindow = dependencies.getWindow();
    if (settingsWindow === null) {
      throw new Error('Settings window is not available.');
    }
    requireSettingsSender(event, settingsWindow);
    return dependencies.getSnapshot();
  });
  ipcMain.handle(IPC_CHANNELS.settingsSave, (event, input: unknown) => {
    const settingsWindow = dependencies.getWindow();
    if (settingsWindow === null) {
      throw new Error('Settings window is not available.');
    }
    requireSettingsSender(event, settingsWindow);
    return dependencies.saveSettings(input);
  });
  ipcMain.handle(IPC_CHANNELS.settingsSetCaptureMode, (event, input: unknown) => {
    const settingsWindow = dependencies.getWindow();
    if (settingsWindow === null) {
      throw new Error('Settings window is not available.');
    }
    requireSettingsSender(event, settingsWindow);
    if (!isCapturePayload(input)) {
      throw new Error('Capture mode payload is invalid.');
    }
    dependencies.setCaptureMode(input.active);
  });
  ipcMain.handle(IPC_CHANNELS.settingsClose, (event) => {
    const settingsWindow = dependencies.getWindow();
    if (settingsWindow === null) {
      return;
    }
    requireSettingsSender(event, settingsWindow).close();
  });

  return () => {
    ipcMain.removeHandler(IPC_CHANNELS.settingsGetSnapshot);
    ipcMain.removeHandler(IPC_CHANNELS.settingsSave);
    ipcMain.removeHandler(IPC_CHANNELS.settingsSetCaptureMode);
    ipcMain.removeHandler(IPC_CHANNELS.settingsClose);
  };
}
