import { app, BrowserWindow, screen } from 'electron';
import { resolveRendererDevServerUrl } from './app/environment';
import { acquireSingleInstanceLock, focusExistingWindow } from './app/single-instance';
import { createLogger } from './app/logger';
import type { DisplayWorkArea, RestoredWindowState } from '../shared/types';
import { resolveAppConfigFromEnvironment } from './security/config';
import { createContentSession } from './security/session';
import { createContentView, type ContentViewController } from './window/content-view';
import { createMainWindow, loadLocalShell } from './window/create-main-window';
import { emitContentState, emitContentZoom, registerIpcHandlers } from './ipc/handlers';
import { installApplicationShortcuts } from './shortcuts/shortcuts';
import { createWindowPresentationController } from './window/fullscreen';
import { restoreWindowState } from './window/window-state';
import { createWindowStateStore, type WindowStateStore } from './window/window-state-store';

let mainWindow: BrowserWindow | null = null;
let contentView: ContentViewController | null = null;
let removeIpcHandlers: (() => void) | undefined;
let removeShortcuts: (() => void) | undefined;
let presentationController: ReturnType<typeof createWindowPresentationController> | undefined;
let windowStateStore: WindowStateStore | undefined;
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
  windowStateStore = createWindowStateStore(app.getPath('userData'));
  const displays = screen.getAllDisplays().map((display): DisplayWorkArea => display.workArea);
  const primaryDisplay: DisplayWorkArea = screen.getPrimaryDisplay().workArea;
  const persistedState = await windowStateStore.load();
  const restoredResult = restoreWindowState(
    persistedState ?? { width: 1600, height: 1000, maximized: false },
    displays,
    primaryDisplay,
  );
  const restoredState: RestoredWindowState = restoredResult.success
    ? restoredResult.value
    : {
        width: 1600,
        height: 1000,
        x: primaryDisplay.x + Math.round((primaryDisplay.width - 1600) / 2),
        y: primaryDisplay.y + Math.round((primaryDisplay.height - 1000) / 2),
        maximized: false,
      };
  mainWindow = createMainWindow(restoredState);
  presentationController = createWindowPresentationController(mainWindow);
  const contentSession = createContentSession(config);
  const createdContentView = createContentView({
    mainWindow,
    contentSession,
    config,
    onStatusChange: (status) => emitContentState(getMainWindow(), status),
  });
  contentView = createdContentView;
  removeIpcHandlers = registerIpcHandlers({
    getWindow: getMainWindow,
    getContentWebContents: () => contentView?.webContents ?? null,
    getContentState: () => contentView?.getState() ?? { type: 'idle' },
    getContentZoomFactor: () => contentView?.getZoomFactor() ?? 1,
    setContentZoomFactor: (factor) => {
      createdContentView.setZoomFactor(factor);
      emitContentZoom(getMainWindow(), createdContentView.getZoomFactor());
    },
    getWindowPresentation: () =>
      presentationController?.getState() ?? {
        presentation: 'windowed',
        presentationBeforeFullscreen: 'windowed',
      },
    toggleMaximize: () => presentationController?.toggleMaximize(),
    toggleFullscreen: () => presentationController?.toggleFullscreen(),
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
  removeShortcuts = installApplicationShortcuts(
    mainWindow.webContents,
    createdContentView.webContents,
    config,
    {
      reloadContent: () => {
        void createdContentView.reload().catch(() => undefined);
      },
      hardReloadContent: () => {
        void createdContentView.hardReload().catch(() => undefined);
      },
      toggleFullscreen: () => presentationController?.toggleFullscreen(),
      resetZoom: () => {
        createdContentView.resetZoom();
        emitContentZoom(getMainWindow(), createdContentView.getZoomFactor());
      },
      zoomIn: () => {
        createdContentView.zoomIn();
        emitContentZoom(getMainWindow(), createdContentView.getZoomFactor());
      },
      zoomOut: () => {
        createdContentView.zoomOut();
        emitContentZoom(getMainWindow(), createdContentView.getZoomFactor());
      },
      openDevTools: () => createdContentView.webContents.openDevTools({ mode: 'detach' }),
      closePalette: () => undefined,
    },
  );
  const persistWindowState = (): void => {
    const currentWindow = getMainWindow();
    if (currentWindow === null || windowStateStore === undefined) {
      return;
    }
    const bounds = currentWindow.getBounds();
    void windowStateStore.save({ ...bounds, maximized: currentWindow.isMaximized() });
  };
  mainWindow.on('resize', persistWindowState);
  mainWindow.on('move', persistWindowState);
  mainWindow.on('maximize', persistWindowState);
  mainWindow.on('unmaximize', persistWindowState);
  mainWindow.on('close', persistWindowState);
  mainWindow.on('closed', () => {
    persistWindowState();
    removeShortcuts?.();
    removeShortcuts = undefined;
    presentationController?.dispose();
    presentationController = undefined;
    contentView?.dispose();
    contentView = null;
    removeIpcHandlers?.();
    removeIpcHandlers = undefined;
    void windowStateStore?.flush();
    windowStateStore = undefined;
    mainWindow = null;
  });

  const rendererDevServerUrl = resolveRendererDevServerUrl();
  await loadLocalShell(
    mainWindow,
    rendererDevServerUrl === undefined ? {} : { rendererDevServerUrl },
  );
  await createdContentView.load();
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
