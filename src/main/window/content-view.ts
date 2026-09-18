import { WebContentsView, type BrowserWindow, type Session } from 'electron';
import type { AppConfig, ContentBounds, ContentStatus } from '../../shared/types';
import { nextZoomFactor, normalizeZoomFactor } from '../../shared/zoom';
import { createLogger } from '../app/logger';
import { configureContentSession } from '../security/session';
import { applyContentBounds } from './content-layout';
import { syncWebContentsWindowDragMode } from './window-drag';

const logger = createLogger('content');

interface ViewResources {
  readonly generation: number;
  readonly view: WebContentsView;
  readonly webContents: Electron.WebContents;
  readonly removeSessionPolicies: () => void;
  readonly removeListeners: () => void;
}

export interface ContentViewController {
  readonly view: WebContentsView;
  readonly webContents: Electron.WebContents;
  readonly load: () => Promise<void>;
  readonly replaceWorkspaceUrl: (url: string) => Promise<void>;
  readonly reload: () => Promise<void>;
  readonly hardReload: () => Promise<void>;
  readonly setBounds: (bounds: ContentBounds) => void;
  readonly setZoomFactor: (factor: number) => void;
  readonly getZoomFactor: () => number;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly resetZoom: () => void;
  readonly getState: () => ContentStatus;
  readonly setOverlayVisible: (visible: boolean) => void;
  readonly setWindowDragMode: (active: boolean) => void;
  readonly dispose: () => void;
}

export interface CreateContentViewOptions {
  readonly mainWindow: BrowserWindow;
  readonly contentSession: Session;
  readonly config: AppConfig;
  readonly onStatusChange: (status: ContentStatus) => void;
  readonly onContextMenu?: (
    params: Electron.ContextMenuParams,
    webContents: Electron.WebContents,
  ) => void;
}

function safeDescription(value: string): string {
  return value.length > 240 ? `${value.slice(0, 240)}…` : value;
}

export function createContentView(options: CreateContentViewOptions): ContentViewController {
  const { mainWindow, contentSession, config, onStatusChange, onContextMenu } = options;
  if (config.content.initialUrl === undefined) {
    throw new Error('A workspace URL is required before the content view is created.');
  }

  let activeWorkspaceUrl = config.content.initialUrl;
  const createWebPreferences = (): Electron.WebPreferences => ({
    session: contentSession,
    nodeIntegration: true,
    contextIsolation: false,
    sandbox: false,
    webSecurity: false,
    allowRunningInsecureContent: true,
  });
  let resources: ViewResources | null = null;
  let status: ContentStatus = { type: 'idle' };
  let zoomFactor = 1;
  let latestBounds: ContentBounds | undefined;
  let overlayVisible = false;
  let generation = 0;
  let disposed = false;
  let windowDragMode = false;
  let dragSyncSerial = 0;
  let dragSyncQueue: Promise<void> = Promise.resolve();

  const scheduleWindowDragModeSync = (target: ViewResources | null = resources): void => {
    if (target === null || disposed) {
      return;
    }
    const serial = ++dragSyncSerial;
    const active = windowDragMode;
    dragSyncQueue = dragSyncQueue
      .catch(() => undefined)
      .then(async () => {
        if (
          serial !== dragSyncSerial ||
          disposed ||
          resources !== target ||
          target.webContents.isDestroyed()
        ) {
          return;
        }
        await syncWebContentsWindowDragMode(target.webContents, active);
      });
  };

  const publishStatus = (nextStatus: ContentStatus, resourceGeneration: number): void => {
    if (disposed || resourceGeneration !== generation) {
      return;
    }
    status = nextStatus;
    resources?.view.setVisible(nextStatus.type === 'ready' && !overlayVisible);
    onStatusChange(nextStatus);
  };

  const currentResources = (): ViewResources => {
    if (resources === null || disposed) {
      throw new Error('The content surface is not available.');
    }
    return resources;
  };

  const disposeResources = (target: ViewResources): void => {
    target.removeSessionPolicies();
    target.removeListeners();
    if (!mainWindow.isDestroyed()) {
      mainWindow.contentView.removeChildView(target.view);
    }
    if (!target.webContents.isDestroyed()) {
      target.webContents.close();
    }
  };

  const createResources = (workspaceUrl: string): ViewResources => {
    const view = new WebContentsView({
      webPreferences: createWebPreferences(),
    });
    const webContents = view.webContents;
    const resourceGeneration = ++generation;
    let activeNavigationUrl = workspaceUrl;

    const handleWillNavigate = (
      _event: Electron.Event,
      url: string,
      _isInPlace: boolean,
      isMainFrame: boolean,
    ): void => {
      if (!isMainFrame || resourceGeneration !== generation) {
        return;
      }
      activeNavigationUrl = url;
    };
    const handleWillRedirect = (
      event: Electron.Event,
      url: string,
      isInPlace: boolean,
      isMainFrame: boolean,
    ): void => {
      handleWillNavigate(event, url, isInPlace, isMainFrame);
    };
    const handleWindowOpen = (
      _details: Electron.HandlerDetails,
    ): Electron.WindowOpenHandlerResponse => {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: createWebPreferences(),
        },
      };
    };
    const handleContextMenu = (event: Electron.Event, params: Electron.ContextMenuParams): void => {
      event.preventDefault();
      onContextMenu?.(params, webContents);
    };
    const handleStartLoading = (): void => publishStatus({ type: 'loading' }, resourceGeneration);
    const handleStopLoading = (): void => {
      if (
        resourceGeneration === generation &&
        status.type === 'loading' &&
        webContents.getURL() === activeNavigationUrl
      ) {
        publishStatus({ type: 'ready' }, resourceGeneration);
      }
    };
    const handleFailLoad = (
      event: Electron.Event,
      errorCode: number,
      errorDescription: string,
      validatedURL: string,
      isMainFrame: boolean,
    ): void => {
      if (
        !isMainFrame ||
        resourceGeneration !== generation ||
        errorCode === -3 ||
        (validatedURL !== activeNavigationUrl && validatedURL !== webContents.getURL())
      ) {
        return;
      }
      event.preventDefault();
      publishStatus(
        {
          type: 'error',
          code: errorCode,
          description: safeDescription(errorDescription || 'The workspace request failed.'),
        },
        resourceGeneration,
      );
    };
    const handleRenderProcessGone = (
      _event: Electron.Event,
      details: Electron.RenderProcessGoneDetails,
    ): void => {
      if (resourceGeneration !== generation) {
        return;
      }
      logger.error('Content render process exited', { reason: details.reason });
      publishStatus({ type: 'crashed' }, resourceGeneration);
    };
    const handleUnresponsive = (): void => logger.warn('Content became unresponsive');
    const handleResponsive = (): void => logger.info('Content became responsive');
    const handleFrameFinishLoad = (): void => {
      if (resourceGeneration === generation && windowDragMode) {
        scheduleWindowDragModeSync();
      }
    };

    webContents.on('will-navigate', handleWillNavigate);
    webContents.on('will-redirect', handleWillRedirect);
    webContents.setWindowOpenHandler(handleWindowOpen);
    webContents.on('context-menu', handleContextMenu);
    webContents.on('did-start-loading', handleStartLoading);
    webContents.on('did-stop-loading', handleStopLoading);
    webContents.on('did-fail-load', handleFailLoad);
    webContents.on('render-process-gone', handleRenderProcessGone);
    webContents.on('unresponsive', handleUnresponsive);
    webContents.on('responsive', handleResponsive);
    webContents.on('did-frame-finish-load', handleFrameFinishLoad);

    const removeSessionPolicies = configureContentSession(contentSession);
    mainWindow.contentView.addChildView(view);
    view.setBackgroundColor('#151515');
    view.setVisible(false);
    if (latestBounds !== undefined) {
      applyContentBounds(view, latestBounds);
    }
    view.webContents.setZoomFactor(zoomFactor);

    const removeListeners = (): void => {
      webContents.removeListener('will-navigate', handleWillNavigate);
      webContents.removeListener('will-redirect', handleWillRedirect);
      webContents.setWindowOpenHandler(() => ({ action: 'allow' }));
      webContents.removeListener('context-menu', handleContextMenu);
      webContents.removeListener('did-start-loading', handleStartLoading);
      webContents.removeListener('did-stop-loading', handleStopLoading);
      webContents.removeListener('did-fail-load', handleFailLoad);
      webContents.removeListener('render-process-gone', handleRenderProcessGone);
      webContents.removeListener('unresponsive', handleUnresponsive);
      webContents.removeListener('responsive', handleResponsive);
      webContents.removeListener('did-frame-finish-load', handleFrameFinishLoad);
    };

    return {
      generation: resourceGeneration,
      view,
      webContents,
      removeSessionPolicies,
      removeListeners,
    };
  };

  const loadResources = async (target: ViewResources, url: string): Promise<void> => {
    publishStatus({ type: 'loading' }, target.generation);
    try {
      await target.webContents.loadURL(url);
    } catch {
      publishStatus(
        {
          type: 'error',
          code: -1,
          description: 'The workspace request failed.',
        },
        target.generation,
      );
    }
  };

  resources = createResources(activeWorkspaceUrl);

  const controller: ContentViewController = {
    get view() {
      return currentResources().view;
    },
    get webContents() {
      return currentResources().webContents;
    },
    load: async () => {
      const target = currentResources();
      await loadResources(target, activeWorkspaceUrl);
    },
    replaceWorkspaceUrl: async (url) => {
      const previous = currentResources();
      windowDragMode = false;
      scheduleWindowDragModeSync(previous);
      activeWorkspaceUrl = url;
      disposeResources(previous);
      resources = createResources(url);
      await loadResources(currentResources(), url);
    },
    reload: async () => {
      const target = currentResources();
      target.webContents.reload();
    },
    hardReload: async () => {
      const target = currentResources();
      target.webContents.reloadIgnoringCache();
    },
    setBounds: (bounds) => {
      latestBounds = bounds;
      if (resources !== null) {
        applyContentBounds(resources.view, bounds);
      }
    },
    setZoomFactor: (factor) => {
      zoomFactor = normalizeZoomFactor(factor);
      if (resources !== null && !resources.webContents.isDestroyed()) {
        resources.webContents.setZoomFactor(zoomFactor);
      }
    },
    getZoomFactor: () => zoomFactor,
    zoomIn: () => {
      controller.setZoomFactor(nextZoomFactor(zoomFactor, 'in'));
    },
    zoomOut: () => {
      controller.setZoomFactor(nextZoomFactor(zoomFactor, 'out'));
    },
    resetZoom: () => {
      controller.setZoomFactor(1);
    },
    getState: () => status,
    setOverlayVisible: (visible) => {
      overlayVisible = visible;
      if (resources !== null) {
        resources.view.setVisible(status.type === 'ready' && !overlayVisible);
      }
    },
    setWindowDragMode: (active) => {
      windowDragMode = active;
      scheduleWindowDragModeSync();
    },
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      windowDragMode = false;
      generation += 1;
      if (resources !== null) {
        disposeResources(resources);
        resources = null;
      }
    },
  };

  return controller;
}
