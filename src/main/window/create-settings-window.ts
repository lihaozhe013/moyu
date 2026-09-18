import { join } from 'node:path';
import { BrowserWindow } from 'electron';
import { createLogger } from '../app/logger';

const logger = createLogger('settings-window');

export interface SettingsWindowLoadTarget {
  readonly rendererDevServerUrl?: string;
}

export interface SettingsWindowController {
  readonly window: BrowserWindow;
  readonly show: () => void;
  readonly close: () => void;
  readonly dispose: () => void;
}

function getPreloadPath(): string {
  return join(__dirname, '../preload/settings.cjs');
}

function getPackagedRendererPath(): string {
  return join(__dirname, '../renderer/settings/index.html');
}

export function createSettingsWindow(
  target: SettingsWindowLoadTarget,
  onClosed: () => void,
): SettingsWindowController {
  const settingsWindow = new BrowserWindow({
    width: 760,
    height: 640,
    minWidth: 640,
    minHeight: 520,
    show: false,
    title: 'Settings',
    backgroundColor: '#181818',
    frame: false,
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.platform === 'darwin') {
    settingsWindow.setWindowButtonVisibility(false);
  }

  let ready = false;
  settingsWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    logger.error('Settings preload failed', { preloadPath, error: error.message });
  });
  settingsWindow.once('ready-to-show', () => {
    ready = true;
    if (!settingsWindow.isDestroyed()) {
      settingsWindow.show();
      settingsWindow.focus();
    }
  });
  settingsWindow.once('closed', onClosed);

  const load = async (): Promise<void> => {
    if (target.rendererDevServerUrl === undefined) {
      await settingsWindow.loadFile(getPackagedRendererPath());
      return;
    }
    const settingsUrl = new URL('settings/index.html', target.rendererDevServerUrl).toString();
    await settingsWindow.loadURL(settingsUrl);
  };

  void load().catch((error: unknown) => {
    logger.error('Failed to load settings window', { error });
  });

  return {
    window: settingsWindow,
    show: () => {
      if (settingsWindow.isDestroyed()) {
        return;
      }
      if (ready && !settingsWindow.isVisible()) {
        settingsWindow.show();
      }
      if (ready) {
        settingsWindow.focus();
      }
    },
    close: () => {
      if (!settingsWindow.isDestroyed()) {
        settingsWindow.close();
      }
    },
    dispose: () => {
      if (!settingsWindow.isDestroyed()) {
        settingsWindow.destroy();
      }
    },
  };
}
