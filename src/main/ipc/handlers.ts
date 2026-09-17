import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc';
import { validateSetZoomFactorPayload } from '../security/ipc-validation';

function isExpectedShellSender(event: IpcMainInvokeEvent, mainWindow: BrowserWindow): boolean {
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

export function registerWindowIpcHandlers(getWindow: () => BrowserWindow | null): () => void {
  const registeredChannels = [
    IPC_CHANNELS.windowMinimize,
    IPC_CHANNELS.windowToggleMaximize,
    IPC_CHANNELS.windowClose,
    IPC_CHANNELS.windowToggleFullscreen,
    IPC_CHANNELS.windowGetState,
    IPC_CHANNELS.contentSetZoomFactor,
  ] as const;

  const getOwnedWindow = (event: IpcMainInvokeEvent): BrowserWindow => {
    const mainWindow = getWindow();
    if (mainWindow === null) {
      throw new Error('Main window is not available.');
    }
    requireShellSender(event, mainWindow);
    return mainWindow;
  };

  ipcMain.handle(IPC_CHANNELS.windowMinimize, (event) => {
    getOwnedWindow(event).minimize();
  });
  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, (event) => {
    const mainWindow = getOwnedWindow(event);
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.handle(IPC_CHANNELS.windowClose, (event) => {
    getOwnedWindow(event).close();
  });
  ipcMain.handle(IPC_CHANNELS.windowToggleFullscreen, (event) => {
    const mainWindow = getOwnedWindow(event);
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });
  ipcMain.handle(IPC_CHANNELS.windowGetState, (event) => {
    const mainWindow = getOwnedWindow(event);
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
  ipcMain.handle(IPC_CHANNELS.contentSetZoomFactor, (event, input: unknown) => {
    const mainWindow = getOwnedWindow(event);
    const validation = validateSetZoomFactorPayload(input);
    if (!validation.success) {
      throw new Error(validation.error);
    }
    mainWindow.webContents.setZoomFactor(validation.value.factor);
  });

  return () => {
    for (const channel of registeredChannels) {
      ipcMain.removeHandler(channel);
    }
  };
}
