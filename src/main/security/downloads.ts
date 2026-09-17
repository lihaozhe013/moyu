import type { Session } from 'electron';
import type { Logger } from '../app/logger';

export function installDownloadPolicy(contentSession: Session, logger: Logger): () => void {
  const handler = (
    event: Electron.Event,
    _item: Electron.DownloadItem,
    webContents: Electron.WebContents,
  ): void => {
    event.preventDefault();
    let origin = '[unknown-origin]';
    try {
      origin = new URL(webContents.getURL()).origin;
    } catch {
      origin = '[invalid-origin]';
    }
    logger.info('Denied content download', { origin });
  };

  contentSession.on('will-download', handler);
  return () => contentSession.off('will-download', handler);
}
