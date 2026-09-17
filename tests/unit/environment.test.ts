import { describe, expect, it } from 'vitest';
import { resolveRendererDevServerUrl, resolveRuntimeMode } from '../../src/main/app/environment';

describe('runtime environment', () => {
  it('resolves only supported modes and defaults unknown values to production', () => {
    expect(resolveRuntimeMode({ NODE_ENV: 'development' })).toBe('development');
    expect(resolveRuntimeMode({ NODE_ENV: 'test' })).toBe('test');
    expect(resolveRuntimeMode({ NODE_ENV: 'production' })).toBe('production');
    expect(resolveRuntimeMode({ NODE_ENV: 'staging' })).toBe('production');
    expect(resolveRuntimeMode({})).toBe('production');
    expect(resolveRuntimeMode({ ELECTRON_RENDERER_URL: 'http://localhost:5173/' })).toBe(
      'development',
    );
  });

  it('validates the optional renderer development URL', () => {
    expect(resolveRendererDevServerUrl({ ELECTRON_RENDERER_URL: 'http://localhost:5173/' })).toBe(
      'http://localhost:5173/',
    );
    expect(resolveRendererDevServerUrl({})).toBeUndefined();
    expect(() =>
      resolveRendererDevServerUrl({ ELECTRON_RENDERER_URL: 'file:///tmp/shell' }),
    ).toThrow('must use HTTP or HTTPS');
    expect(() => resolveRendererDevServerUrl({ ELECTRON_RENDERER_URL: 'not a URL' })).toThrow(
      'must be a valid URL',
    );
  });
});
