import { app, BrowserWindow, Menu, screen } from 'electron';
import { resolveRendererDevServerUrl } from './app/environment';
import { acquireSingleInstanceLock, focusExistingWindow } from './app/single-instance';
import { createLogger } from './app/logger';
import type {
  AppConfig,
  CommandId,
  ContentBounds,
  ContentStatus,
  DisplayWorkArea,
  RestoredWindowState,
  SettingsSaveResult,
  SettingsSnapshot,
} from '../shared/types';
import { IPC_CHANNELS } from '../shared/ipc';
import { resolveAppConfigFromEnvironment, withWorkspaceUrl } from './security/config';
import { validateSettingsDraft } from './security/preferences-validation';
import { createContentSession } from './security/session';
import { createContentView, type ContentViewController } from './window/content-view';
import {
  createMainWindow,
  installApplicationMenu,
  loadLocalShell,
} from './window/create-main-window';
import {
  createSettingsWindow,
  type SettingsWindowController,
} from './window/create-settings-window';
import { emitContentState, emitContentZoom, registerIpcHandlers } from './ipc/handlers';
import { registerSettingsIpcHandlers } from './ipc/settings-handlers';
import { installApplicationShortcuts, installShortcutHandler } from './shortcuts/shortcuts';
import { createWindowPresentationController } from './window/fullscreen';
import { restoreWindowState } from './window/window-state';
import { createPreferencesStore, type PreferencesStore } from './preferences/store';
import {
  createCommandRegistry,
  validateCommandOverrides,
  type CommandRegistry,
} from './commands/command-registry';
import { collectGpuDiagnostics } from './gpu/diagnostics';
import { installShellContentSecurityPolicy } from './security/csp';
import { buildApplicationContextMenuTemplate } from './window/context-menu';

let mainWindow: BrowserWindow | null = null;
let contentView: ContentViewController | null = null;
let settingsWindow: SettingsWindowController | null = null;
let removeIpcHandlers: (() => void) | undefined;
let removeSettingsIpcHandlers: (() => void) | undefined;
let removeShortcuts: (() => void) | undefined;
let removeSettingsShortcuts: (() => void) | undefined;
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

  const environmentConfig = resolveAppConfigFromEnvironment();
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
  let activeConfig = environmentConfig;
  if (preferences.workspaceUrl !== undefined) {
    try {
      activeConfig = withWorkspaceUrl(environmentConfig, preferences.workspaceUrl);
    } catch (error: unknown) {
      logger.warn('Ignoring an invalid persisted workspace URL', { error });
    }
  }

  const restoredResult = restoreWindowState(preferences.window, displays, primaryDisplay);
  const restoredState: RestoredWindowState = restoredResult.success
    ? restoredResult.value
    : fallbackWindow;
  const registry = createCommandRegistry(
    process.platform === 'darwin' ? 'darwin' : 'win32',
    preferences.shortcuts,
  );
  commandRegistry = registry;
  const rendererDevServerUrl = resolveRendererDevServerUrl();
  let settingsCapturing = false;
  let lastWindowedBounds: Electron.Rectangle = restoredState;
  let latestContentBounds: ContentBounds | undefined;

  const executeCommand = (commandId: CommandId): void => {
    const currentWindow = getMainWindow();
    switch (commandId) {
      case 'settings.open':
        openSettings();
        return;
      case 'settings.save':
        settingsWindow?.window.webContents.send(IPC_CHANNELS.settingsSaveRequested);
        return;
      case 'window.minimize':
        currentWindow?.minimize();
        return;
      case 'window.toggleMaximize':
        presentationController?.toggleMaximize();
        return;
      case 'window.close': {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (settingsWindow !== null && focusedWindow === settingsWindow.window) {
          settingsWindow.window.webContents.send(IPC_CHANNELS.settingsCloseRequested);
        } else {
          currentWindow?.close();
        }
        return;
      }
      case 'app.quit':
        app.quit();
        return;
      case 'window.toggleFullscreen':
        presentationController?.toggleFullscreen();
        return;
      case 'content.reload':
        void contentView?.reload().catch(() => undefined);
        return;
      case 'content.hardReload':
        void contentView?.hardReload().catch(() => undefined);
        return;
      case 'content.zoomReset':
        contentView?.resetZoom();
        if (contentView !== null) {
          emitContentZoom(getMainWindow(), contentView.getZoomFactor());
        }
        return;
      case 'content.zoomIn':
        contentView?.zoomIn();
        if (contentView !== null) {
          emitContentZoom(getMainWindow(), contentView.getZoomFactor());
        }
        return;
      case 'content.zoomOut':
        contentView?.zoomOut();
        if (contentView !== null) {
          emitContentZoom(getMainWindow(), contentView.getZoomFactor());
        }
        return;
      case 'devtools.open':
        if (
          environmentConfig.mode !== 'production' &&
          environmentConfig.development.enableDevTools
        ) {
          contentView?.webContents.openDevTools({ mode: 'detach' });
        }
        return;
      case 'palette.open':
      case 'shell.about':
      case 'shell.gpuDiagnostics':
        contentView?.setOverlayVisible(true);
        currentWindow?.webContents.send(IPC_CHANNELS.commandPaletteOpen);
        return;
    }
  };

  const showApplicationContextMenu = (
    params: Electron.ContextMenuParams,
    targetContents: Electron.WebContents,
  ): void => {
    const currentWindow = getMainWindow();
    if (currentWindow === null || commandRegistry === undefined) {
      return;
    }
    const template = buildApplicationContextMenuTemplate({
      registry: commandRegistry,
      platform: process.platform === 'darwin' ? 'darwin' : 'win32',
      production: environmentConfig.mode === 'production',
      enableDevTools: environmentConfig.development.enableDevTools,
      targetContents,
      params,
      executeCommand,
    });
    Menu.buildFromTemplate(template).popup({ window: currentWindow, x: params.x, y: params.y });
  };

  function installContentShortcuts(): void {
    removeShortcuts?.();
    const currentWindow = getMainWindow();
    if (currentWindow === null || commandRegistry === undefined) {
      removeShortcuts = undefined;
      return;
    }
    removeShortcuts = installApplicationShortcuts(
      currentWindow.webContents,
      contentView?.webContents ?? null,
      environmentConfig,
      commandRegistry,
      {
        executeCommand,
        dismissOverlays: () => {
          contentView?.setOverlayVisible(false);
          currentWindow.webContents.send(IPC_CHANNELS.commandPaletteClose);
        },
      },
    );
  }

  function createWorkspaceContent(config: AppConfig): ContentViewController {
    const created = createContentView({
      mainWindow: getMainWindow() as BrowserWindow,
      contentSession,
      config,
      onStatusChange: (status: ContentStatus) => emitContentState(getMainWindow(), status),
      onContextMenu: showApplicationContextMenu,
    });
    contentView = created;
    if (latestContentBounds !== undefined) {
      created.setBounds(latestContentBounds);
    }
    installContentShortcuts();
    return created;
  }

  function openSettings(): void {
    if (settingsWindow !== null) {
      settingsWindow.show();
      return;
    }
    settingsWindow = createSettingsWindow(
      rendererDevServerUrl === undefined ? {} : { rendererDevServerUrl },
      () => {
        removeSettingsShortcuts?.();
        removeSettingsShortcuts = undefined;
        settingsCapturing = false;
        settingsWindow = null;
      },
    );
    const currentWindow = getMainWindow();
    if (currentWindow !== null && commandRegistry !== undefined) {
      removeSettingsShortcuts = installShortcutHandler(
        settingsWindow.window.webContents,
        currentWindow.webContents,
        commandRegistry,
        environmentConfig,
        'settings',
        {
          executeCommand,
          dismissOverlays: () =>
            settingsWindow?.window.webContents.send(IPC_CHANNELS.settingsDismissRequested),
          isCapturing: () => settingsCapturing,
        },
      );
    }
    settingsWindow.show();
  }

  async function saveSettings(input: unknown): Promise<SettingsSaveResult> {
    const draftValidation = validateSettingsDraft(input);
    if (!draftValidation.success) {
      return {
        success: false,
        fieldErrors: { form: draftValidation.error },
        message: draftValidation.error,
      };
    }
    const draft = draftValidation.value;
    const commandValidation = validateCommandOverrides(registry.definitions, draft.shortcuts);
    if (!commandValidation.valid) {
      const message = commandValidation.errors.join(' ');
      return { success: false, fieldErrors: { shortcuts: message }, message };
    }

    let nextConfig: AppConfig;
    try {
      nextConfig = withWorkspaceUrl(environmentConfig, draft.workspaceUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Workspace URL is invalid.';
      return { success: false, fieldErrors: { workspaceUrl: message }, message };
    }

    const previousUrl = activeConfig.content.initialUrl;
    if (preferencesStore === undefined) {
      return {
        success: false,
        fieldErrors: { form: 'Settings storage is not available.' },
        message: 'Settings storage is not available.',
      };
    }
    try {
      await preferencesStore.update({
        workspaceUrl: draft.workspaceUrl,
        shortcuts: commandValidation.overrides,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Settings could not be saved.';
      return { success: false, fieldErrors: { form: message }, message };
    }

    registry.setOverrides(commandValidation.overrides);
    activeConfig = nextConfig;
    installApplicationMenu(registry, executeCommand);
    let workspaceReloadStarted = false;
    if (contentView === null) {
      const created = createWorkspaceContent(nextConfig);
      await created.load();
      workspaceReloadStarted = true;
    } else if (previousUrl !== draft.workspaceUrl) {
      removeShortcuts?.();
      await contentView.replaceWorkspaceUrl(draft.workspaceUrl);
      installContentShortcuts();
      workspaceReloadStarted = true;
    }

    return {
      success: true,
      snapshot: getSettingsSnapshot(),
      workspaceReloadStarted,
    };
  }

  function getSettingsSnapshot(): SettingsSnapshot {
    return {
      ...(activeConfig.content.initialUrl === undefined
        ? {}
        : { workspaceUrl: activeConfig.content.initialUrl }),
      commands: registry
        .getSummaries()
        .filter(
          (command) =>
            !command.devOnly ||
            (environmentConfig.mode !== 'production' &&
              environmentConfig.development.enableDevTools),
        ),
      shortcutOverrides: registry.getOverrides(),
    };
  }

  const restoredWindow = createMainWindow(restoredState, {
    commandRegistry: registry,
    executeCommand,
  });
  mainWindow = restoredWindow;
  let lastBounds = restoredWindow.getBounds();
  lastWindowedBounds = lastBounds;
  presentationController = createWindowPresentationController(restoredWindow);
  const contentSession = createContentSession(activeConfig);
  if (activeConfig.content.initialUrl !== undefined) {
    createWorkspaceContent(activeConfig);
  } else {
    installContentShortcuts();
  }

  removeIpcHandlers = registerIpcHandlers({
    getWindow: getMainWindow,
    getContentWebContents: () => contentView?.webContents ?? null,
    getContentState: () => contentView?.getState() ?? { type: 'idle' },
    getContentZoomFactor: () => contentView?.getZoomFactor() ?? 1,
    setContentZoomFactor: (factor) => {
      contentView?.setZoomFactor(factor);
      if (contentView !== null) {
        emitContentZoom(getMainWindow(), contentView.getZoomFactor());
      }
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
    setContentBounds: (bounds) => {
      latestContentBounds = bounds;
      contentView?.setBounds(bounds);
    },
    getGpuDiagnostics: collectGpuDiagnostics,
    getCommandSummaries: () =>
      registry
        .getSummaries()
        .filter(
          (command) =>
            !command.devOnly ||
            (environmentConfig.mode !== 'production' &&
              environmentConfig.development.enableDevTools),
        ),
    executeCommand,
    setOverlayVisible: (visible) => contentView?.setOverlayVisible(visible),
  });

  removeSettingsIpcHandlers = registerSettingsIpcHandlers({
    getWindow: () => settingsWindow?.window ?? null,
    getSnapshot: getSettingsSnapshot,
    saveSettings,
    setCaptureMode: (active) => {
      settingsCapturing = active;
    },
  });

  restoredWindow.webContents.on('context-menu', (event, params) => {
    event.preventDefault();
    showApplicationContextMenu(params, restoredWindow.webContents);
  });

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
      lastBounds = currentWindow.getBounds();
      lastWindowedBounds = lastBounds;
    }
    void preferencesStore
      .update({ window: { ...lastWindowedBounds, maximized } })
      .catch((error: unknown) =>
        logger.warn('Failed to persist application preferences', { error }),
      );
  };
  const schedulePersistWindowState = (updateWindowedBounds: boolean): void => {
    setImmediate(() => persistWindowState(updateWindowedBounds));
  };
  restoredWindow.on('resize', () => schedulePersistWindowState(true));
  restoredWindow.on('move', () => schedulePersistWindowState(true));
  restoredWindow.on('maximize', () => persistWindowState(false));
  restoredWindow.on('unmaximize', () => persistWindowState(false));
  restoredWindow.on('close', () => persistWindowState(true));
  restoredWindow.on('closed', () => {
    persistWindowState(false);
    settingsWindow?.dispose();
    settingsWindow = null;
    removeShortcuts?.();
    removeShortcuts = undefined;
    removeSettingsShortcuts?.();
    removeSettingsShortcuts = undefined;
    presentationController?.dispose();
    presentationController = undefined;
    contentView?.dispose();
    contentView = null;
    removeIpcHandlers?.();
    removeIpcHandlers = undefined;
    removeSettingsIpcHandlers?.();
    removeSettingsIpcHandlers = undefined;
    void preferencesStore?.flush();
    preferencesStore = undefined;
    commandRegistry = undefined;
    mainWindow = null;
  });

  const removeShellCsp = installShellContentSecurityPolicy(
    restoredWindow.webContents.session,
    environmentConfig.mode,
    rendererDevServerUrl,
  );
  restoredWindow.once('closed', removeShellCsp);
  await loadLocalShell(
    restoredWindow,
    rendererDevServerUrl === undefined ? {} : { rendererDevServerUrl },
  );
  if (contentView !== null) {
    await contentView.load();
  } else {
    openSettings();
  }
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
