import { WebContentsView, type BrowserWindow, type Session } from 'electron';
import type { AppConfig, ContentBounds, ContentStatus } from '../../shared/types';
import { createLogger } from '../app/logger';
import { evaluateNavigation } from '../navigation/navigation-policy';
import { evaluatePopup } from '../navigation/popup-policy';
import { configureContentSession } from '../security/session';
import { applyContentBounds } from './content-layout';

const logger = createLogger('content');

export interface ContentViewController {
  readonly view: WebContentsView;
  readonly webContents: Electron.WebContents;
  readonly load: () => Promise<void>;
  readonly reload: () => Promise<void>;
  readonly hardReload: () => Promise<void>;
  readonly setBounds: (bounds: ContentBounds) => void;
  readonly getState: () => ContentStatus;
  readonly dispose: () => void;
}

export interface CreateContentViewOptions {
  readonly mainWindow: BrowserWindow;
  readonly contentSession: Session;
  readonly config: AppConfig;
  readonly onStatusChange: (status: ContentStatus) => void;
}

function safeDescription(value: string): string {
  return value.length > 240 ? `${value.slice(0, 240)}…` : value;
}

export function createContentView(options: CreateContentViewOptions): ContentViewController {
  const { mainWindow, contentSession, config, onStatusChange } = options;
  const view = new WebContentsView({
    webPreferences: {
      session: contentSession,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  const webContents = view.webContents;
  let status: ContentStatus = { type: 'idle' };
  let disposed = false;

  const publishStatus = (nextStatus: ContentStatus): void => {
    if (disposed) {
      return;
    }
    status = nextStatus;
    view.setVisible(nextStatus.type === 'ready');
    onStatusChange(nextStatus);
  };

  const handleWillNavigate = (
    event: Electron.Event,
    url: string,
    _isInPlace: boolean,
    isMainFrame: boolean,
  ): void => {
    if (!isMainFrame) {
      return;
    }
    const decision = evaluateNavigation(url, config);
    if (decision.action === 'deny') {
      event.preventDefault();
      logger.info('Denied content navigation', { reason: decision.reason });
    }
  };
  const handleWillRedirect = (
    event: Electron.Event,
    url: string,
    _isInPlace: boolean,
    isMainFrame: boolean,
  ): void => {
    handleWillNavigate(event, url, _isInPlace, isMainFrame);
  };
  const handleWindowOpen = (
    details: Electron.HandlerDetails,
  ): Electron.WindowOpenHandlerResponse => {
    const decision = evaluatePopup(details.url, config);
    logger.info('Denied content popup', { reason: decision.reason });
    return { action: 'deny' };
  };
  const handleContextMenu = (event: Electron.Event): void => {
    event.preventDefault();
  };
  const handleStartLoading = (): void => publishStatus({ type: 'loading' });
  const handleStopLoading = (): void => {
    if (status.type === 'loading') {
      publishStatus({ type: 'ready' });
    }
  };
  const handleFailLoad = (
    event: Electron.Event,
    errorCode: number,
    errorDescription: string,
    _validatedURL: string,
    isMainFrame: boolean,
  ): void => {
    if (!isMainFrame || errorCode === -3) {
      return;
    }
    event.preventDefault();
    publishStatus({
      type: 'error',
      code: errorCode,
      description: safeDescription(errorDescription || 'The workspace request failed.'),
    });
  };
  const handleRenderProcessGone = (
    _event: Electron.Event,
    details: Electron.RenderProcessGoneDetails,
  ): void => {
    logger.error('Content render process exited', { reason: details.reason });
    publishStatus({ type: 'crashed' });
  };
  const handleUnresponsive = (): void => logger.warn('Content became unresponsive');
  const handleResponsive = (): void => logger.info('Content became responsive');

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

  const removeSessionPolicies = configureContentSession(contentSession, webContents, logger);
  mainWindow.contentView.addChildView(view);
  view.setBackgroundColor('#151515');
  view.setVisible(false);

  const controller: ContentViewController = {
    view,
    webContents,
    load: async () => {
      publishStatus({ type: 'loading' });
      try {
        await webContents.loadURL(config.content.initialUrl);
      } catch {
        if (status.type !== 'error' && status.type !== 'crashed') {
          publishStatus({
            type: 'error',
            code: -1,
            description: 'The workspace request failed.',
          });
        }
      }
    },
    reload: async () => {
      if (webContents.isDestroyed()) {
        throw new Error('The content surface is not available.');
      }
      webContents.reload();
    },
    hardReload: async () => {
      if (webContents.isDestroyed()) {
        throw new Error('The content surface is not available.');
      }
      webContents.reloadIgnoringCache();
    },
    setBounds: (bounds) => {
      if (!disposed) {
        applyContentBounds(view, bounds);
      }
    },
    getState: () => status,
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      removeSessionPolicies();
      webContents.removeListener('will-navigate', handleWillNavigate);
      webContents.removeListener('will-redirect', handleWillRedirect);
      webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      webContents.removeListener('context-menu', handleContextMenu);
      webContents.removeListener('did-start-loading', handleStartLoading);
      webContents.removeListener('did-stop-loading', handleStopLoading);
      webContents.removeListener('did-fail-load', handleFailLoad);
      webContents.removeListener('render-process-gone', handleRenderProcessGone);
      webContents.removeListener('unresponsive', handleUnresponsive);
      webContents.removeListener('responsive', handleResponsive);
      if (!mainWindow.isDestroyed()) {
        mainWindow.contentView.removeChildView(view);
      }
      if (!webContents.isDestroyed()) {
        webContents.close();
      }
    },
  };

  return controller;
}
