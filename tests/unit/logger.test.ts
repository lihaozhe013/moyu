import { describe, expect, it } from 'vitest';
import { createLogger, sanitizeContext } from '../../src/main/app/logger';

describe('logger', () => {
  it('redacts secret fields and reduces URLs to origins', () => {
    expect(
      sanitizeContext({
        cookie: 'session=private',
        authorization: 'Bearer private',
        url: new URL('https://workspace.example.test/private?token=secret'),
        targetUrl: 'https://workspace.example.test/private?token=secret',
        count: 3,
      }),
    ).toEqual({
      cookie: '[redacted]',
      authorization: '[redacted]',
      url: 'https://workspace.example.test',
      targetUrl: 'https://workspace.example.test',
      count: 3,
    });
  });

  it('writes categorized messages through the supplied sink', () => {
    const entries: Array<[string, string, Record<string, unknown> | undefined]> = [];
    const sink = {
      debug: (message: string, context?: Record<string, unknown>) =>
        entries.push(['debug', message, context]),
      info: (message: string, context?: Record<string, unknown>) =>
        entries.push(['info', message, context]),
      warn: (message: string, context?: Record<string, unknown>) =>
        entries.push(['warn', message, context]),
      error: (message: string, context?: Record<string, unknown>) =>
        entries.push(['error', message, context]),
    };
    const logger = createLogger('security', sink);

    logger.warn('Permission denied', { permission: 'geolocation', token: 'private' });

    expect(entries).toEqual([
      ['warn', '[security] Permission denied', { permission: 'geolocation', token: '[redacted]' }],
    ]);
  });
});
