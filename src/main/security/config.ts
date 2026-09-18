import type { AppConfig, AppMode, DevelopmentConfig, ValidationResult } from '../../shared/types';
import { resolveRuntimeMode } from '../app/environment';

export interface AppConfigInput {
  readonly mode: AppMode;
  readonly initialUrl?: string;
  readonly enableDevTools?: boolean;
  readonly persistSession?: boolean;
  readonly sessionName?: string;
}

export class ConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function isAppMode(value: unknown): value is AppMode {
  return value === 'development' || value === 'production' || value === 'test';
}

function parseInitialUrl(value: string | undefined): URL | undefined {
  if (value === undefined) {
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigurationError('The initial content URL is invalid.');
  }

  return parsed;
}

export function validateAppConfigInput(input: unknown): ValidationResult<AppConfigInput> {
  if (typeof input !== 'object' || input === null) {
    return { success: false, error: 'Configuration must be an object.' };
  }

  const candidate = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'mode',
    'initialUrl',
    'enableDevTools',
    'persistSession',
    'sessionName',
  ]);
  if (Object.keys(candidate).some((key) => !allowedKeys.has(key))) {
    return { success: false, error: 'Configuration contains an unknown field.' };
  }
  if (!isAppMode(candidate.mode)) {
    return { success: false, error: 'Configuration mode is invalid.' };
  }
  if (
    candidate.initialUrl !== undefined &&
    (typeof candidate.initialUrl !== 'string' || candidate.initialUrl.length === 0)
  ) {
    return { success: false, error: 'Configuration initialUrl must be a non-empty string.' };
  }
  for (const [name, value] of [
    ['enableDevTools', candidate.enableDevTools],
    ['persistSession', candidate.persistSession],
  ] as const) {
    if (value !== undefined && typeof value !== 'boolean') {
      return { success: false, error: `Configuration ${name} must be a boolean.` };
    }
  }
  if (candidate.sessionName !== undefined && typeof candidate.sessionName !== 'string') {
    return { success: false, error: 'Configuration sessionName must be a string.' };
  }

  const enableDevTools = candidate.enableDevTools;

  return {
    success: true,
    value: {
      mode: candidate.mode,
      ...(candidate.initialUrl === undefined ? {} : { initialUrl: candidate.initialUrl }),
      ...(enableDevTools === undefined ? {} : { enableDevTools: enableDevTools as boolean }),
      ...(candidate.persistSession === undefined
        ? {}
        : { persistSession: candidate.persistSession as boolean }),
      ...(candidate.sessionName === undefined
        ? {}
        : { sessionName: candidate.sessionName as string }),
    },
  };
}

export function createAppConfig(input: AppConfigInput): AppConfig {
  const validation = validateAppConfigInput(input);
  if (!validation.success) {
    throw new ConfigurationError(validation.error);
  }

  const { mode, initialUrl, sessionName = 'workspace' } = validation.value;
  if (!/^[a-zA-Z0-9._-]+$/.test(sessionName)) {
    throw new ConfigurationError('Configuration sessionName contains unsupported characters.');
  }
  const parsedInitialUrl = parseInitialUrl(initialUrl);

  const development: DevelopmentConfig = {
    enableDevTools: input.enableDevTools ?? mode !== 'production',
  };

  const content = {
    ...(parsedInitialUrl === undefined ? {} : { initialUrl: parsedInitialUrl.toString() }),
  };

  const persistSession = input.persistSession ?? false;
  return {
    mode,
    content,
    development,
    session: {
      persist: persistSession,
      partition: persistSession ? `persist:${sessionName}` : sessionName,
    },
  };
}

export function withWorkspaceUrl(config: AppConfig, workspaceUrl: string): AppConfig {
  return createAppConfig({
    mode: config.mode,
    initialUrl: workspaceUrl,
    enableDevTools: config.development.enableDevTools,
    persistSession: config.session.persist,
    sessionName: config.session.partition.replace(/^persist:/, ''),
  });
}

const TEST_DEFAULT_URL = 'http://127.0.0.1:4311/';

function readBoolean(environment: NodeJS.ProcessEnv, key: string, fallback: boolean): boolean {
  const raw = environment[key];
  if (raw === undefined) {
    return fallback;
  }
  if (raw === 'true' || raw === '1') {
    return true;
  }
  if (raw === 'false' || raw === '0') {
    return false;
  }
  throw new ConfigurationError(`${key} must be true or false.`);
}

export function resolveAppConfigFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const mode = resolveRuntimeMode(environment);
  const configuredUrl = environment.APP_CONTENT_URL;
  const initialUrl =
    configuredUrl === undefined
      ? mode === 'test'
        ? TEST_DEFAULT_URL
        : undefined
      : configuredUrl.length > 0
        ? configuredUrl
        : undefined;
  return createAppConfig({
    mode,
    ...(initialUrl === undefined ? {} : { initialUrl }),
    enableDevTools: readBoolean(environment, 'APP_ENABLE_DEVTOOLS', mode !== 'production'),
    persistSession: readBoolean(environment, 'APP_PERSIST_SESSION', false),
    ...(environment.APP_SESSION_NAME === undefined
      ? {}
      : { sessionName: environment.APP_SESSION_NAME }),
  });
}
