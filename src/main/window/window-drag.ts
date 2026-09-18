import type { BrowserWindow, WebContents } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';

const WINDOW_DRAG_STYLE_ID = '__moyu_window_drag_mode__';
const WINDOW_DRAG_STYLE = `
html[data-moyu-window-drag-mode="active"],
html[data-moyu-window-drag-mode="active"] * {
  -webkit-app-region: drag !important;
  app-region: drag !important;
  cursor: grabbing !important;
  user-select: none !important;
  -webkit-user-select: none !important;
}
`;

function createWindowDragScript(active: boolean): string {
  const styleId = JSON.stringify(WINDOW_DRAG_STYLE_ID);
  const styleText = JSON.stringify(WINDOW_DRAG_STYLE);
  return `(() => {
    const root = document.documentElement;
    if (!root) return;
    const styleId = ${styleId};
    if (${active ? 'true' : 'false'}) {
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        (document.head || root).appendChild(style);
      }
      style.textContent = ${styleText};
      root.dataset.moyuWindowDragMode = 'active';
    } else {
      root.removeAttribute('data-moyu-window-drag-mode');
      document.getElementById(styleId)?.remove();
    }
  })();`;
}

export async function syncWebContentsWindowDragMode(
  contents: WebContents,
  active: boolean,
): Promise<void> {
  if (contents.isDestroyed()) {
    return;
  }

  const script = createWindowDragScript(active);
  try {
    const frames = contents.mainFrame.framesInSubtree;
    await Promise.all(
      frames.map(async (frame) => {
        if (frame.isDestroyed() || frame.detached) {
          return;
        }
        try {
          await frame.executeJavaScript(script);
        } catch {
          return;
        }
      }),
    );
  } catch {
    return;
  }
}

export interface WindowDragSurface {
  readonly setWindowDragMode: (active: boolean) => void;
}

export interface WindowDragController {
  readonly isActive: () => boolean;
  readonly setActive: (active: boolean) => void;
  readonly refresh: () => void;
  readonly dispose: () => void;
}

export interface WindowDragControllerOptions {
  readonly window: BrowserWindow;
  readonly getContentSurface: () => WindowDragSurface | null;
}

export function createWindowDragController(
  options: WindowDragControllerOptions,
): WindowDragController {
  let active = false;
  let disposed = false;

  const publish = (): void => {
    if (disposed || options.window.isDestroyed()) {
      return;
    }
    options.window.webContents.send(IPC_CHANNELS.windowDragModeChanged, active);
    options.getContentSurface()?.setWindowDragMode(active);
  };
  const handleWindowBlur = (): void => {
    if (active) {
      active = false;
      publish();
    }
  };

  options.window.on('blur', handleWindowBlur);

  return {
    isActive: () => active,
    setActive: (nextActive) => {
      if (disposed) {
        return;
      }
      if (active === nextActive) {
        if (nextActive) {
          options.getContentSurface()?.setWindowDragMode(true);
        }
        return;
      }
      active = nextActive;
      publish();
    },
    refresh: () => {
      if (active) {
        publish();
      }
    },
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      options.window.removeListener('blur', handleWindowBlur);
      options.getContentSurface()?.setWindowDragMode(false);
      if (!options.window.isDestroyed()) {
        options.window.webContents.send(IPC_CHANNELS.windowDragModeChanged, false);
      }
      active = false;
    },
  };
}
