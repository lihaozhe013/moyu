import { join } from 'node:path';
import { BrowserWindow, Menu, type BrowserWindowConstructorOptions } from 'electron';
import type { RestoredWindowState } from '../../shared/types';
import { createLogger } from '../app/logger';

const logger = createLogger('window');

export interface ShellLoadTarget {
  readonly rendererDevServerUrl?: string;
}

function getPreloadPath(): string {
  return join(__dirname, '../preload/index.mjs');
}

function getPackagedRendererPath(): string {
  return join(__dirname, '../renderer/index.html');
}

function getPlatformWindowOptions(): Partial<BrowserWindowConstructorOptions> {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 9 },
    };
  }

  return {
    frame: false,
  };
}

function installApplicationMenu(): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }

  const menu = Menu.buildFromTemplate([
    {
      label: 'Professional Canvas',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'windowMenu' },
  ]);
  Menu.setApplicationMenu(menu);
}

export function createMainWindow(restoredState?: RestoredWindowState): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: restoredState?.width ?? 1600,
    height: restoredState?.height ?? 1000,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#181818',
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    ...(restoredState === undefined ? {} : { x: restoredState.x, y: restoredState.y }),
    ...getPlatformWindowOptions(),
  });

  if (restoredState?.maximized === true) {
    mainWindow.maximize();
  }

  installApplicationMenu();
  mainWindow.on('unresponsive', () => logger.warn('Local shell became unresponsive'));
  mainWindow.on('responsive', () => logger.info('Local shell became responsive'));
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  return mainWindow;
}

export async function loadLocalShell(
  mainWindow: BrowserWindow,
  target: ShellLoadTarget,
): Promise<void> {
  if (target.rendererDevServerUrl !== undefined) {
    await mainWindow.loadURL(target.rendererDevServerUrl);
    return;
  }

  await mainWindow.loadFile(getPackagedRendererPath());
}
