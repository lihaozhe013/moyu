import type { LogLevel } from './logger-types';

export type LogCategory =
  'app' | 'window' | 'settings-window' | 'content' | 'navigation' | 'security' | 'gpu' | 'ipc';

export interface LogContext {
  readonly [key: string]: unknown;
}

export interface LoggerSink {
  readonly debug: (message: string, context?: Record<string, unknown>) => void;
  readonly info: (message: string, context?: Record<string, unknown>) => void;
  readonly warn: (message: string, context?: Record<string, unknown>) => void;
  readonly error: (message: string, context?: Record<string, unknown>) => void;
}

export interface Logger {
  readonly debug: (message: string, context?: LogContext) => void;
  readonly info: (message: string, context?: LogContext) => void;
  readonly warn: (message: string, context?: LogContext) => void;
  readonly error: (message: string, context?: LogContext) => void;
}

const SECRET_KEY_PATTERN = /(cookie|token|secret|password|authorization|credential|body)/i;

function sanitizeValue(key: string, value: unknown): unknown {
  if (SECRET_KEY_PATTERN.test(key)) {
    return '[redacted]';
  }
  if (value instanceof URL) {
    return value.origin;
  }
  if (typeof value === 'string') {
    if (/(url|href|location)/i.test(key)) {
      try {
        return new URL(value).origin;
      } catch {
        return '[invalid-url]';
      }
    }
    if (value.length > 512) {
      return `${value.slice(0, 512)}…`;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 32).map((entry) => sanitizeValue(key, entry));
  }
  if (typeof value === 'object' && value !== null) {
    return sanitizeContext(value as Record<string, unknown>);
  }
  return String(value);
}

export function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(context)
      .slice(0, 64)
      .map(([key, value]) => [key, sanitizeValue(key, value)]),
  );
}

export function createLogger(category: LogCategory, sink: LoggerSink = console): Logger {
  const write = (level: LogLevel, message: string, context?: LogContext): void => {
    const sanitized = context === undefined ? undefined : sanitizeContext(context);
    const taggedMessage = `[${category}] ${message}`;
    sink[level](taggedMessage, sanitized);
  };

  return {
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
  };
}
