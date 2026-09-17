import { app, BrowserWindow } from 'electron';
import { resolveRendererDevServerUrl } from './app/environment';
import { acquireSingleInstanceLock, focusExistingWindow } from './app/single-instance';
import { createMainWindow, loadLocalShell } from './window/create-main-window';
import { registerWindowIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;
let removeIpcHandlers: (() => void) | undefined;

function getMainWindow(): BrowserWindow | null {
  return mainWindow !== null && !mainWindow.isDestroyed() ? mainWindow : null;
}

async function createApplicationWindow(): Promise<void> {
  if (getMainWindow() !== null) {
    focusExistingWindow(getMainWindow());
    return;
  }

  mainWindow = createMainWindow();
  removeIpcHandlers = registerWindowIpcHandlers(getMainWindow);
  mainWindow.on('closed', () => {
    removeIpcHandlers?.();
    removeIpcHandlers = undefined;
    mainWindow = null;
  });

  const rendererDevServerUrl = resolveRendererDevServerUrl();
  await loadLocalShell(
    mainWindow,
    rendererDevServerUrl === undefined ? {} : { rendererDevServerUrl },
  );
}

async function startApplication(): Promise<void> {
  if (!acquireSingleInstanceLock(() => focusExistingWindow(getMainWindow()))) {
    app.quit();
    return;
  }

  await app.whenReady();
  await createApplicationWindow();

  app.on('activate', () => {
    if (getMainWindow() === null) {
      void createApplicationWindow();
    } else {
      focusExistingWindow(getMainWindow());
    }
  });
}

void startApplication().catch((error: unknown) => {
  console.error('Application startup failed', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
