import { app, type BrowserWindow } from 'electron';

export function acquireSingleInstanceLock(onSecondInstance: () => void): boolean {
  if (!app.requestSingleInstanceLock()) {
    return false;
  }

  app.on('second-instance', onSecondInstance);
  return true;
}

export function focusExistingWindow(window: BrowserWindow | null): void {
  if (window === null || window.isDestroyed()) {
    return;
  }

  if (window.isMinimized()) {
    window.restore();
  }
  if (!window.isVisible()) {
    window.show();
  }
  window.focus();
}
