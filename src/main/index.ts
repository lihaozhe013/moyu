import { app, BrowserWindow } from 'electron';
import { resolveRendererDevServerUrl } from './app/environment';
import { acquireSingleInstanceLock, focusExistingWindow } from './app/single-instance';
import { resolveAppConfigFromEnvironment } from './security/config';
import { createContentSession } from './security/session';
import { createLogger } from './app/logger';
import { createContentView, type ContentViewController } from './window/content-view';
import { createMainWindow, loadLocalShell } from './window/create-main-window';
import { emitContentState, registerIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;
let contentView: ContentViewController | null = null;
let removeIpcHandlers: (() => void) | undefined;
const logger = createLogger('app');

function getMainWindow(): BrowserWindow | null {
  return mainWindow !== null && !mainWindow.isDestroyed() ? mainWindow : null;
}

async function createApplicationWindow(): Promise<void> {
  if (getMainWindow() !== null) {
    focusExistingWindow(getMainWindow());
    return;
  }

  const config = resolveAppConfigFromEnvironment();
  mainWindow = createMainWindow();
  const contentSession = createContentSession(config);
  contentView = createContentView({
    mainWindow,
    contentSession,
    config,
    onStatusChange: (status) => emitContentState(getMainWindow(), status),
  });
  removeIpcHandlers = registerIpcHandlers({
    getWindow: getMainWindow,
    getContentWebContents: () => contentView?.webContents ?? null,
    getContentState: () => contentView?.getState() ?? { type: 'idle' },
    reloadContent: async () => {
      if (contentView === null) {
        throw new Error('The content surface is not initialized.');
      }
      await contentView.reload();
    },
    hardReloadContent: async () => {
      if (contentView === null) {
        throw new Error('The content surface is not initialized.');
      }
      await contentView.hardReload();
    },
    setContentBounds: (bounds) => contentView?.setBounds(bounds),
  });
  mainWindow.on('closed', () => {
    contentView?.dispose();
    contentView = null;
    removeIpcHandlers?.();
    removeIpcHandlers = undefined;
    mainWindow = null;
  });

  const rendererDevServerUrl = resolveRendererDevServerUrl();
  await loadLocalShell(
    mainWindow,
    rendererDevServerUrl === undefined ? {} : { rendererDevServerUrl },
  );
  await contentView.load();
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
      void createApplicationWindow().catch((error: unknown) => {
        logger.error('Failed to recreate application window', { error });
      });
    } else {
      focusExistingWindow(getMainWindow());
    }
  });
}

void startApplication().catch((error: unknown) => {
  logger.error('Application startup failed', { error });
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
