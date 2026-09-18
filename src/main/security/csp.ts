import type { AppMode } from '../../shared/types';
import type { Session } from 'electron';

export function getShellContentSecurityPolicy(mode: AppMode): string {
  const scriptSources = mode === 'development' ? "'self' 'unsafe-inline'" : "'self'";
  const connectSources = mode === 'development' ? "'self' ws: http: https:" : "'self'";
  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function installShellContentSecurityPolicy(
  shellSession: Session,
  mode: AppMode,
  rendererDevServerUrl?: string,
): () => void {
  const filter =
    rendererDevServerUrl === undefined
      ? { urls: ['file://*/*'] }
      : { urls: [`${new URL(rendererDevServerUrl).origin}/*`] };
  const handler = (
    details: Electron.OnHeadersReceivedListenerDetails,
    callback: (response: Electron.HeadersReceivedResponse) => void,
  ): void => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    responseHeaders['Content-Security-Policy'] = [getShellContentSecurityPolicy(mode)];
    callback({ responseHeaders });
  };

  shellSession.webRequest.onHeadersReceived(filter, handler);
  return () => shellSession.webRequest.onHeadersReceived(null);
}
