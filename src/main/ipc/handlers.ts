import { BrowserWindow, ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from './channels';
import type { ContentBounds, ContentStatus } from '../../shared/types';
import {
  validateSetContentBoundsPayload,
  validateSetZoomFactorPayload,
} from '../security/ipc-validation';

export interface IpcHandlerDependencies {
  readonly getWindow: () => BrowserWindow | null;
  readonly getContentWebContents?: () => Electron.WebContents | null;
  readonly getContentState?: () => ContentStatus;
  readonly reloadContent?: () => Promise<void>;
  readonly hardReloadContent?: () => Promise<void>;
  readonly setContentBounds?: (bounds: ContentBounds) => void;
}

export function isExpectedShellSender(
  event: IpcMainInvokeEvent,
  mainWindow: BrowserWindow,
): boolean {
  return (
    !mainWindow.isDestroyed() &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  );
}

function requireShellSender(event: IpcMainInvokeEvent, mainWindow: BrowserWindow): void {
  if (!isExpectedShellSender(event, mainWindow)) {
    throw new Error('IPC sender is not the local shell.');
  }
}

function getOwnedWindow(
  event: IpcMainInvokeEvent,
  dependencies: IpcHandlerDependencies,
): BrowserWindow {
  const mainWindow = dependencies.getWindow();
  if (mainWindow === null) {
    throw new Error('Main window is not available.');
  }
  requireShellSender(event, mainWindow);
  return mainWindow;
}

function requireContentWebContents(dependencies: IpcHandlerDependencies): Electron.WebContents {
  const contentWebContents = dependencies.getContentWebContents?.() ?? null;
  if (contentWebContents === null || contentWebContents.isDestroyed()) {
    throw new Error('The content surface is not initialized.');
  }
  return contentWebContents;
}

export function emitContentState(mainWindow: BrowserWindow | null, state: ContentStatus): void {
  if (mainWindow === null || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send(IPC_CHANNELS.contentStateChanged, state);
}

export function registerIpcHandlers(dependencies: IpcHandlerDependencies): () => void {
  const registeredInvokeChannels = [
    IPC_CHANNELS.windowMinimize,
    IPC_CHANNELS.windowToggleMaximize,
    IPC_CHANNELS.windowClose,
    IPC_CHANNELS.windowToggleFullscreen,
    IPC_CHANNELS.windowGetState,
    IPC_CHANNELS.contentReload,
    IPC_CHANNELS.contentHardReload,
    IPC_CHANNELS.contentSetZoomFactor,
    IPC_CHANNELS.contentGetState,
    IPC_CHANNELS.layoutSetContentBounds,
  ] as const;

  ipcMain.handle(IPC_CHANNELS.windowMinimize, (event) => {
    getOwnedWindow(event, dependencies).minimize();
  });
  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, (event) => {
    const mainWindow = getOwnedWindow(event, dependencies);
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.handle(IPC_CHANNELS.windowClose, (event) => {
    getOwnedWindow(event, dependencies).close();
  });
  ipcMain.handle(IPC_CHANNELS.windowToggleFullscreen, (event) => {
    const mainWindow = getOwnedWindow(event, dependencies);
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });
  ipcMain.handle(IPC_CHANNELS.windowGetState, (event) => {
    const mainWindow = getOwnedWindow(event, dependencies);
    return {
      presentation: {
        presentation: mainWindow.isFullScreen()
          ? 'fullscreen'
          : mainWindow.isMaximized()
            ? 'maximized'
            : 'windowed',
        presentationBeforeFullscreen: mainWindow.isMaximized() ? 'maximized' : 'windowed',
      },
      persisted: {
        ...mainWindow.getBounds(),
        maximized: mainWindow.isMaximized(),
      },
    };
  });
  ipcMain.handle(IPC_CHANNELS.contentReload, (event) => {
    getOwnedWindow(event, dependencies);
    if (dependencies.reloadContent === undefined) {
      throw new Error('The content surface is not initialized.');
    }
    return dependencies.reloadContent();
  });
  ipcMain.handle(IPC_CHANNELS.contentHardReload, (event) => {
    getOwnedWindow(event, dependencies);
    if (dependencies.hardReloadContent === undefined) {
      throw new Error('The content surface is not initialized.');
    }
    return dependencies.hardReloadContent();
  });
  ipcMain.handle(IPC_CHANNELS.contentSetZoomFactor, (event, input: unknown) => {
    getOwnedWindow(event, dependencies);
    const validation = validateSetZoomFactorPayload(input);
    if (!validation.success) {
      throw new Error(validation.error);
    }
    requireContentWebContents(dependencies).setZoomFactor(validation.value.factor);
  });
  ipcMain.handle(IPC_CHANNELS.contentGetState, (event) => {
    getOwnedWindow(event, dependencies);
    return dependencies.getContentState?.() ?? { type: 'idle' };
  });
  ipcMain.handle(IPC_CHANNELS.layoutSetContentBounds, (event, input: unknown) => {
    getOwnedWindow(event, dependencies);
    const validation = validateSetContentBoundsPayload(input);
    if (!validation.success) {
      throw new Error(validation.error);
    }
    if (dependencies.setContentBounds === undefined) {
      throw new Error('The content surface is not initialized.');
    }
    dependencies.setContentBounds(validation.value);
  });

  return () => {
    for (const channel of registeredInvokeChannels) {
      ipcMain.removeHandler(channel);
    }
  };
}

export function isExpectedShellEventSender(
  event: IpcMainEvent,
  mainWindow: BrowserWindow,
): boolean {
  return !mainWindow.isDestroyed() && event.sender === mainWindow.webContents;
}
