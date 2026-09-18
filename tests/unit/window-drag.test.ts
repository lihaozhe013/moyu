import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import type { BrowserWindow, WebContents, WebFrameMain } from 'electron';
import { IPC_CHANNELS } from '../../src/shared/ipc';
import {
  createWindowDragController,
  syncWebContentsWindowDragMode,
} from '../../src/main/window/window-drag';

describe('window drag support', () => {
  it('syncs the temporary drag style across every loaded frame', async () => {
    const scripts: string[] = [];
    const createFrame = (): WebFrameMain =>
      ({
        detached: false,
        executeJavaScript: vi.fn(async (script: string) => {
          scripts.push(script);
        }),
        isDestroyed: () => false,
      }) as unknown as WebFrameMain;
    const contents = {
      isDestroyed: () => false,
      mainFrame: {
        framesInSubtree: [createFrame(), createFrame()],
      },
    } as unknown as WebContents;

    await syncWebContentsWindowDragMode(contents, true);
    expect(scripts).toHaveLength(2);
    expect(scripts.every((script) => script.includes('-webkit-app-region: drag'))).toBe(true);
    expect(scripts.every((script) => script.includes('active'))).toBe(true);

    scripts.length = 0;
    await syncWebContentsWindowDragMode(contents, false);
    expect(scripts).toHaveLength(2);
    expect(scripts.every((script) => script.includes('removeAttribute'))).toBe(true);
  });

  it('publishes mode changes to the shell and current content surface', () => {
    const windowEvents = new EventEmitter();
    const send = vi.fn();
    const window = Object.assign(windowEvents, {
      isDestroyed: () => false,
      webContents: { send },
    }) as unknown as BrowserWindow;
    const setWindowDragMode = vi.fn();
    const controller = createWindowDragController({
      window,
      getContentSurface: () => ({ setWindowDragMode }),
    });

    controller.setActive(true);
    expect(controller.isActive()).toBe(true);
    expect(send).toHaveBeenLastCalledWith(IPC_CHANNELS.windowDragModeChanged, true);
    expect(setWindowDragMode).toHaveBeenLastCalledWith(true);

    windowEvents.emit('blur');
    expect(controller.isActive()).toBe(false);
    expect(send).toHaveBeenLastCalledWith(IPC_CHANNELS.windowDragModeChanged, false);
    expect(setWindowDragMode).toHaveBeenLastCalledWith(false);

    controller.setActive(true);
    controller.setActive(false);
    expect(controller.isActive()).toBe(false);
    expect(send).toHaveBeenLastCalledWith(IPC_CHANNELS.windowDragModeChanged, false);
    expect(setWindowDragMode).toHaveBeenLastCalledWith(false);

    controller.dispose();
    expect(setWindowDragMode).toHaveBeenLastCalledWith(false);
  });
});
