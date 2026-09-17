import type { AppMode } from '../../shared/types';

export function getShellContentSecurityPolicy(mode: AppMode): string {
  const connectSources = mode === 'development' ? "'self' ws: http: https:" : "'self'";
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}
