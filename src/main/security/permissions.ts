import type { Session, WebContents } from 'electron';
import type { Logger } from '../app/logger';

export function installPermissionPolicy(
  contentSession: Session,
  contentWebContents: WebContents,
  logger: Logger,
): () => void {
  const requestHandler = (
    requestingWebContents: WebContents,
    permission: Parameters<NonNullable<Parameters<Session['setPermissionRequestHandler']>[0]>>[1],
    callback: (permissionGranted: boolean) => void,
  ): void => {
    const isContentRequest = requestingWebContents === contentWebContents;
    logger.info('Denied content permission request', {
      permission,
      contentRequest: isContentRequest,
    });
    callback(false);
  };

  const checkHandler = (
    requestingWebContents: WebContents | null,
    permission: Parameters<NonNullable<Parameters<Session['setPermissionCheckHandler']>[0]>>[1],
    requestingOrigin: string,
  ): boolean => {
    logger.debug('Denied content permission check', {
      permission,
      requestingOrigin: requestingOrigin || '[empty-origin]',
      contentRequest: requestingWebContents === contentWebContents,
    });
    return false;
  };

  contentSession.setPermissionRequestHandler(requestHandler);
  contentSession.setPermissionCheckHandler(checkHandler);

  return () => {
    contentSession.setPermissionRequestHandler(null);
    contentSession.setPermissionCheckHandler(null);
  };
}
