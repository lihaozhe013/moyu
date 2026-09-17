import type { DesktopAPI } from '../../../shared/ipc';

declare global {
  interface Window {
    readonly desktopAPI?: DesktopAPI;
  }
}

export {};
