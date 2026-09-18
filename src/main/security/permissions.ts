import type { Session } from 'electron';

export function installPermissionPolicy(contentSession: Session): () => void {
  const requestHandler = (
    _requestingWebContents: Parameters<
      NonNullable<Parameters<Session['setPermissionRequestHandler']>[0]>
    >[0],
    _permission: Parameters<NonNullable<Parameters<Session['setPermissionRequestHandler']>[0]>>[1],
    callback: (permissionGranted: boolean) => void,
  ): void => {
    callback(true);
  };

  const checkHandler = (): boolean => true;

  contentSession.setPermissionRequestHandler(requestHandler);
  contentSession.setPermissionCheckHandler(checkHandler);

  return () => {
    contentSession.setPermissionRequestHandler(null);
    contentSession.setPermissionCheckHandler(null);
  };
}
