import { describe, expect, it } from 'vitest';
import type { BrowserWindow, WebContents, WebFrameMain } from 'electron';
import { isExpectedShellSender } from '../../src/main/ipc/handlers';

function createWindowFixture(): {
  readonly mainWindow: BrowserWindow;
  readonly webContents: WebContents;
  readonly mainFrame: WebFrameMain;
} {
  const mainFrame = {} as WebFrameMain;
  const webContents = { mainFrame } as WebContents;
  const mainWindow = {
    isDestroyed: () => false,
    webContents,
  } as BrowserWindow;
  return { mainWindow, webContents, mainFrame };
}

describe('IPC sender boundary', () => {
  it('accepts only the local shell main frame', () => {
    const { mainWindow, webContents, mainFrame } = createWindowFixture();
    expect(
      isExpectedShellSender({ sender: webContents, senderFrame: mainFrame } as never, mainWindow),
    ).toBe(true);
    expect(
      isExpectedShellSender({ sender: webContents, senderFrame: {} } as never, mainWindow),
    ).toBe(false);
    expect(
      isExpectedShellSender(
        { sender: {} as WebContents, senderFrame: mainFrame } as never,
        mainWindow,
      ),
    ).toBe(false);
  });

  it('rejects a destroyed local window', () => {
    const { webContents, mainFrame } = createWindowFixture();
    const mainWindow = {
      isDestroyed: () => true,
      webContents,
    } as BrowserWindow;
    expect(
      isExpectedShellSender({ sender: webContents, senderFrame: mainFrame } as never, mainWindow),
    ).toBe(false);
  });
});
