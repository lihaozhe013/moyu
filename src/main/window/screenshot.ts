import type { BrowserWindow, NativeImage, WebContents } from 'electron';

export type CaptureTarget = 'content' | 'window';

export function captureContentSurface(contentWebContents: WebContents): Promise<NativeImage> {
  return contentWebContents.capturePage();
}

export function captureApplicationWindow(mainWindow: BrowserWindow): Promise<NativeImage> {
  return mainWindow.webContents.capturePage();
}
