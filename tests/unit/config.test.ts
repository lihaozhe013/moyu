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
  allowedOrigins: ['https://workspace.example.test'],
};

describe('application configuration', () => {
  it('normalizes valid origins and applies development defaults', () => {
    const config = createAppConfig({
      ...baseInput,
      allowedOrigins: ['https://workspace.example.test/'],
    });

    expect(config.content.allowedOrigins).toEqual(['https://workspace.example.test']);
    expect(config.content.initialUrl).toBe('https://workspace.example.test/workspace');
    expect(config.development).toEqual({
      enableDevTools: true,
      allowArbitraryNavigation: false,
    });
    expect(config.session).toEqual({ persist: false, partition: 'workspace' });
  });

  it('accepts loopback HTTP only outside production', () => {
    expect(
      createAppConfig({
        mode: 'test',
        initialUrl: 'http://127.0.0.1:4311/',
        allowedOrigins: ['http://127.0.0.1:4311'],
      }).content.allowedOrigins,
    ).toEqual(['http://127.0.0.1:4311']);

    expect(() =>
      createAppConfig({
        mode: 'production',
        initialUrl: 'http://workspace.example.test/',
        allowedOrigins: ['http://workspace.example.test'],
        enableDevTools: false,
      }),
    ).toThrow(ConfigurationError);
  });

  it('requires the initial origin to be allowlisted', () => {
    expect(() =>
      createAppConfig({
        ...baseInput,
        allowedOrigins: ['https://other.example.test'],
      }),
    ).toThrow('initial content URL origin must be allowlisted');
  });

  it('rejects production development capabilities and invalid inputs', () => {
    expect(() =>
      createAppConfig({
        mode: 'production',
        initialUrl: 'https://workspace.example.test/',
        allowedOrigins: ['https://workspace.example.test'],
        enableDevTools: true,
      }),
    ).toThrow('development capabilities must be disabled');

    expect(validateAppConfigInput({ ...baseInput, enableDevTools: 'yes' })).toMatchObject({
      success: false,
    });
    expect(validateAppConfigInput({ ...baseInput, unexpected: true })).toMatchObject({
      success: false,
    });
    expect(validateAppConfigInput({ ...baseInput, allowedOrigins: [] })).toMatchObject({
      success: true,
    });
    expect(() => createAppConfig({ ...baseInput, allowedOrigins: [] })).toThrow(
      'allowedOrigins must contain at least one origin',
    );
  });

  it('resolves environment values once with explicit boolean parsing', () => {
    const config = resolveAppConfigFromEnvironment({
      NODE_ENV: 'test',
      APP_CONTENT_URL: 'http://127.0.0.1:4311/workspace',
      APP_ALLOWED_ORIGINS: 'http://127.0.0.1:4311',
      APP_PERSIST_SESSION: 'true',
      APP_SESSION_NAME: 'fixture-session',
      APP_ENABLE_DEVTOOLS: 'false',
    });

    expect(config).toMatchObject({
      mode: 'test',
      development: { enableDevTools: false, allowArbitraryNavigation: false },
      session: { persist: true, partition: 'persist:fixture-session' },
    });
    expect(() => resolveAppConfigFromEnvironment({ NODE_ENV: 'production' })).toThrow(
      'APP_CONTENT_URL is required',
    );
    expect(() =>
      resolveAppConfigFromEnvironment({ NODE_ENV: 'test', APP_ENABLE_DEVTOOLS: 'maybe' }),
    ).toThrow('APP_ENABLE_DEVTOOLS must be true or false');
  });
});
