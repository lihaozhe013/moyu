import type { SettingsAPI } from '../../shared/ipc';

declare global {
  interface Window {
    readonly settingsAPI?: SettingsAPI;
  }
}

export {};
