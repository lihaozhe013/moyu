import type { AppMode } from '../../shared/types';

export function resolveRuntimeMode(environment: NodeJS.ProcessEnv = process.env): AppMode {
  const value = environment.NODE_ENV;
  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }
  return 'production';
}

export function resolveRendererDevServerUrl(
  environment: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const value = environment.ELECTRON_RENDERER_URL;
  if (value === undefined || value.length === 0) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('ELECTRON_RENDERER_URL must be a valid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('ELECTRON_RENDERER_URL must use HTTP or HTTPS.');
  }

  return parsed.toString();
}
