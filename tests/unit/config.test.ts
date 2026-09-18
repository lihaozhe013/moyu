import { describe, expect, it } from 'vitest';
import {
  ConfigurationError,
  createAppConfig,
  resolveAppConfigFromEnvironment,
  validateAppConfigInput,
} from '../../src/main/security/config';

const baseInput = {
  mode: 'development' as const,
  initialUrl: 'https://workspace.example.test/workspace',
};

describe('application configuration', () => {
  it('normalizes a parseable URL and applies mode defaults', () => {
    const config = createAppConfig(baseInput);

    expect(config.content).toEqual({ initialUrl: 'https://workspace.example.test/workspace' });
    expect(config.development).toEqual({ enableDevTools: true });
    expect(config.session).toEqual({ persist: false, partition: 'workspace' });
  });

  it('accepts HTTP, HTTPS, local, credentialed, and other parseable Electron URLs', () => {
    for (const initialUrl of [
      'http://127.0.0.1:4311/',
      'https://user:secret@workspace.example.test/path',
      'file:///tmp/workspace.html',
      'data:text/html,<h1>workspace</h1>',
    ]) {
      expect(createAppConfig({ mode: 'production', initialUrl }).content.initialUrl).toBe(
        new URL(initialUrl).toString(),
      );
    }
  });

  it('allows production to use the same content URL behavior as development', () => {
    expect(
      createAppConfig({
        mode: 'production',
        initialUrl: 'http://workspace.example.test/',
        enableDevTools: false,
      }),
    ).toMatchObject({
      mode: 'production',
      content: { initialUrl: 'http://workspace.example.test/' },
      development: { enableDevTools: false },
    });
  });

  it('allows an empty first-run configuration and rejects only malformed values', () => {
    const emptyContent = createAppConfig({ mode: 'development', enableDevTools: true }).content;
    expect(emptyContent).toEqual({});
    expect(validateAppConfigInput({ ...baseInput, unexpected: true })).toMatchObject({
      success: false,
    });
    expect(() => createAppConfig({ ...baseInput, initialUrl: 'not a URL' })).toThrow(
      ConfigurationError,
    );
  });

  it('resolves environment values with explicit boolean parsing', () => {
    const config = resolveAppConfigFromEnvironment({
      NODE_ENV: 'test',
      APP_CONTENT_URL: 'http://127.0.0.1:4311/workspace',
      APP_ALLOWED_ORIGINS: 'ignored',
      APP_AUTHENTICATION_ORIGINS: 'ignored',
      APP_ALLOW_ARBITRARY_NAVIGATION: 'ignored',
      APP_PERSIST_SESSION: 'true',
      APP_SESSION_NAME: 'fixture-session',
      APP_ENABLE_DEVTOOLS: 'false',
    });

    expect(config).toMatchObject({
      mode: 'test',
      content: { initialUrl: 'http://127.0.0.1:4311/workspace' },
      development: { enableDevTools: false },
      session: { persist: true, partition: 'persist:fixture-session' },
    });
    const productionWithoutWorkspace = resolveAppConfigFromEnvironment({ NODE_ENV: 'production' });
    expect(productionWithoutWorkspace.content).toEqual({});
    expect(() =>
      resolveAppConfigFromEnvironment({ NODE_ENV: 'test', APP_ENABLE_DEVTOOLS: 'maybe' }),
    ).toThrow('APP_ENABLE_DEVTOOLS must be true or false');
  });
});
