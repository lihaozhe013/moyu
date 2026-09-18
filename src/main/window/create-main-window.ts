import { join } from 'node:path';
import { BrowserWindow, Menu, type BrowserWindowConstructorOptions } from 'electron';
import type { CommandId } from '../../shared/types';
import { toElectronAccelerator } from '../../shared/commands';
import type { CommandRegistry } from '../commands/command-registry';
import type { RestoredWindowState } from '../../shared/types';
import { createLogger } from '../app/logger';

const logger = createLogger('window');

export interface ShellLoadTarget {
  readonly rendererDevServerUrl?: string;
}

export interface MainWindowOptions {
  readonly commandRegistry: CommandRegistry;
  readonly executeCommand: (commandId: CommandId) => void;
}

function getPreloadPath(): string {
  return join(__dirname, '../preload/index.cjs');
}

function getPackagedRendererPath(): string {
  return join(__dirname, '../renderer/index.html');
}

function getPlatformWindowOptions(): Partial<BrowserWindowConstructorOptions> {
  return {
    frame: false,
  };
}

export function installApplicationMenu(
  commandRegistry: CommandRegistry,
  executeCommand: (commandId: CommandId) => void,
): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }

  const settingsAccelerator = toElectronAccelerator(
    commandRegistry.getBinding('settings.open'),
    'darwin',
  );
  const quitAccelerator = toElectronAccelerator(commandRegistry.getBinding('app.quit'), 'darwin');
  const menu = Menu.buildFromTemplate([
    {
      label: 'Professional Canvas',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings…',
          ...(settingsAccelerator === undefined ? {} : { accelerator: settingsAccelerator }),
          click: () => executeCommand('settings.open'),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        {
          role: 'quit',
          ...(quitAccelerator === undefined ? {} : { accelerator: quitAccelerator }),
        },
      ],
    },
    { role: 'editMenu' },
    { role: 'windowMenu' },
  ]);
  Menu.setApplicationMenu(menu);
}

export function createMainWindow(
  restoredState: RestoredWindowState | undefined,
  options: MainWindowOptions,
): BrowserWindow {
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

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    logger.error('Local shell preload failed', {
      preloadPath,
      error: error.message,
    });
  });

  if (restoredState?.maximized === true) {
    mainWindow.maximize();
  }

  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false);
  }
  installApplicationMenu(options.commandRegistry, options.executeCommand);
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
