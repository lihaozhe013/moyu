import { app, BrowserWindow, screen } from 'electron';
import { resolveRendererDevServerUrl } from './app/environment';
import { acquireSingleInstanceLock, focusExistingWindow } from './app/single-instance';
import { createLogger } from './app/logger';
import type { CommandId, DisplayWorkArea, RestoredWindowState } from '../shared/types';
import { resolveAppConfigFromEnvironment } from './security/config';
import { createContentSession } from './security/session';
import { createContentView, type ContentViewController } from './window/content-view';
import { createMainWindow, loadLocalShell } from './window/create-main-window';
import { emitContentState, emitContentZoom, registerIpcHandlers } from './ipc/handlers';
import { installApplicationShortcuts } from './shortcuts/shortcuts';
import { createWindowPresentationController } from './window/fullscreen';
import { restoreWindowState } from './window/window-state';
import { createPreferencesStore, type PreferencesStore } from './preferences/store';
import { createCommandRegistry, type CommandRegistry } from './commands/command-registry';
import { collectGpuDiagnostics } from './gpu/diagnostics';
import { installShellContentSecurityPolicy } from './security/csp';

let mainWindow: BrowserWindow | null = null;
let contentView: ContentViewController | null = null;
let removeIpcHandlers: (() => void) | undefined;
let removeShortcuts: (() => void) | undefined;
let presentationController: ReturnType<typeof createWindowPresentationController> | undefined;
let preferencesStore: PreferencesStore | undefined;
let commandRegistry: CommandRegistry | undefined;
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
  const displays = screen.getAllDisplays().map((display): DisplayWorkArea => display.workArea);
  const primaryDisplay: DisplayWorkArea = screen.getPrimaryDisplay().workArea;
  const fallbackWindow: RestoredWindowState = {
    width: 1600,
    height: 1000,
    x: primaryDisplay.x + Math.round((primaryDisplay.width - 1600) / 2),
    y: primaryDisplay.y + Math.round((primaryDisplay.height - 1000) / 2),
    maximized: false,
  };
  preferencesStore = createPreferencesStore(app.getPath('userData'), fallbackWindow);
  const preferences = await preferencesStore.load();
  commandRegistry = createCommandRegistry(
    process.platform === 'darwin' ? 'darwin' : 'win32',
    preferences.shortcuts,
  );
  const restoredResult = restoreWindowState(
    preferences.window,
    displays,
    primaryDisplay,
  );
  const restoredState: RestoredWindowState = restoredResult.success
    ? restoredResult.value
    : fallbackWindow;
  const executeCommand = (commandId: CommandId): void => {
    const currentWindow = getMainWindow();
    if (currentWindow === null) {
      return;
    }
    switch (commandId) {
      case 'window.minimize':
        currentWindow.minimize();
        break;
      case 'window.toggleMaximize':
        presentationController?.toggleMaximize();
        break;
      case 'window.close':
        currentWindow.close();
        break;
      case 'app.quit':
        app.quit();
        break;
      case 'window.toggleFullscreen':
        presentationController?.toggleFullscreen();
        break;
      case 'content.reload':
        void contentView?.reload().catch(() => undefined);
        break;
      case 'content.hardReload':
        void contentView?.hardReload().catch(() => undefined);
        break;
      case 'content.zoomReset':
        if (contentView !== null) {
          contentView.resetZoom();
          emitContentZoom(getMainWindow(), contentView.getZoomFactor());
        }
        break;
      case 'content.zoomIn':
        if (contentView !== null) {
          contentView.zoomIn();
          emitContentZoom(getMainWindow(), contentView.getZoomFactor());
        }
        break;
      case 'content.zoomOut':
        if (contentView !== null) {
          contentView.zoomOut();
          emitContentZoom(getMainWindow(), contentView.getZoomFactor());
        }
        break;
      case 'palette.open':
        currentWindow.webContents.send('command-palette:open');
        break;
      case 'settings.open':
      case 'settings.save':
      case 'shell.about':
      case 'shell.gpuDiagnostics':
      case 'devtools.open':
        break;
    }
  };
  mainWindow = createMainWindow(restoredState, {
    commandRegistry,
    executeCommand,
  });
  let lastWindowedBounds = mainWindow.getBounds();
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
    getGpuDiagnostics: collectGpuDiagnostics,
  });
  removeShortcuts = installApplicationShortcuts(
    mainWindow.webContents,
    createdContentView.webContents,
    config,
    commandRegistry,
    {
      executeCommand: (commandId) => {
        if (commandId === 'devtools.open' && config.mode === 'development') {
          createdContentView.webContents.openDevTools({ mode: 'detach' });
          return;
        }
        executeCommand(commandId);
      },
      dismissOverlays: () => {
        mainWindow?.webContents.send('command-palette:close');
      },
    },
  );
  const persistWindowState = (updateWindowedBounds: boolean): void => {
    const currentWindow = getMainWindow();
    if (currentWindow === null || preferencesStore === undefined) {
      return;
    }
    const presentation = presentationController?.getState();
    const inFullscreen =
      presentation?.presentation === 'fullscreen' || currentWindow.isFullScreen();
    const maximized =
      presentation?.presentation === 'maximized' ||
      (presentation?.presentation === 'fullscreen' &&
        presentation.presentationBeforeFullscreen === 'maximized');
    if (
      updateWindowedBounds &&
      !inFullscreen &&
      presentation?.presentation === 'windowed' &&
      !currentWindow.isMaximized()
    ) {
      lastWindowedBounds = currentWindow.getBounds();
    }
    void preferencesStore
      .update({ window: { ...lastWindowedBounds, maximized } })
      .catch((error: unknown) => logger.warn('Failed to persist application preferences', { error }));
  };
  const schedulePersistWindowState = (updateWindowedBounds: boolean): void => {
    setImmediate(() => persistWindowState(updateWindowedBounds));
  };
  mainWindow.on('resize', () => schedulePersistWindowState(true));
  mainWindow.on('move', () => schedulePersistWindowState(true));
  mainWindow.on('maximize', () => persistWindowState(false));
  mainWindow.on('unmaximize', () => persistWindowState(false));
  mainWindow.on('close', () => persistWindowState(true));
  mainWindow.on('closed', () => {
    persistWindowState(false);
    removeShortcuts?.();
    removeShortcuts = undefined;
    presentationController?.dispose();
    presentationController = undefined;
    contentView?.dispose();
    contentView = null;
    removeIpcHandlers?.();
    removeIpcHandlers = undefined;
    void preferencesStore?.flush();
    preferencesStore = undefined;
    commandRegistry = undefined;
    mainWindow = null;
  });

  const rendererDevServerUrl = resolveRendererDevServerUrl();
  const removeShellCsp = installShellContentSecurityPolicy(
    mainWindow.webContents.session,
    config.mode,
    rendererDevServerUrl,
  );
  mainWindow.once('closed', removeShellCsp);
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
