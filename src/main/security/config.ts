import type {
  AppConfig,
  AppMode,
  ContentConfig,
  DevelopmentConfig,
  ValidationResult,
} from '../../shared/types';
import { resolveRuntimeMode } from '../app/environment';
import { normalizeOrigin } from '../navigation/allowed-origins';

export interface AppConfigInput {
  readonly mode: AppMode;
  readonly initialUrl?: string;
  readonly allowedOrigins: readonly string[];
  readonly authenticationOrigins?: readonly string[];
  readonly enableDevTools?: boolean;
  readonly allowArbitraryNavigation?: boolean;
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

function parseInitialUrl(value: string | undefined, mode: AppMode): URL | undefined {
  if (value === undefined) {
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigurationError('The initial content URL is invalid.');
  }

  if (parsed.username || parsed.password) {
    throw new ConfigurationError('The initial content URL must not contain credentials.');
  }

  if (parsed.protocol !== 'https:' && !(mode !== 'production' && parsed.protocol === 'http:')) {
    throw new ConfigurationError('Production content must use HTTPS.');
  }

  return parsed;
}

function parseOrigins(values: readonly string[], fieldName: string): readonly string[] {
  const normalized = values.map((value) => {
    try {
      return normalizeOrigin(value);
    } catch {
      throw new ConfigurationError(`${fieldName} contains an invalid origin.`);
    }
  });

  return [...new Set(normalized)];
}

export function validateAppConfigInput(input: unknown): ValidationResult<AppConfigInput> {
  if (typeof input !== 'object' || input === null) {
    return { success: false, error: 'Configuration must be an object.' };
  }

  const candidate = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'mode',
    'initialUrl',
    'allowedOrigins',
    'authenticationOrigins',
    'enableDevTools',
    'allowArbitraryNavigation',
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
  if (
    !Array.isArray(candidate.allowedOrigins) ||
    candidate.allowedOrigins.some((value) => typeof value !== 'string')
  ) {
    return { success: false, error: 'Configuration allowedOrigins must be an array of strings.' };
  }

  const authenticationOrigins = candidate.authenticationOrigins;
  if (
    authenticationOrigins !== undefined &&
    (!Array.isArray(authenticationOrigins) ||
      authenticationOrigins.some((value) => typeof value !== 'string'))
  ) {
    return {
      success: false,
      error: 'Configuration authenticationOrigins must be an array of strings.',
    };
  }

  for (const [name, value] of [
    ['enableDevTools', candidate.enableDevTools],
    ['allowArbitraryNavigation', candidate.allowArbitraryNavigation],
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
  const allowArbitraryNavigation = candidate.allowArbitraryNavigation;

  return {
    success: true,
    value: {
      mode: candidate.mode,
      ...(candidate.initialUrl === undefined ? {} : { initialUrl: candidate.initialUrl }),
      allowedOrigins: candidate.allowedOrigins as string[],
      ...(authenticationOrigins === undefined
        ? {}
        : { authenticationOrigins: authenticationOrigins as string[] }),
      ...(enableDevTools === undefined ? {} : { enableDevTools: enableDevTools as boolean }),
      ...(allowArbitraryNavigation === undefined
        ? {}
        : { allowArbitraryNavigation: allowArbitraryNavigation as boolean }),
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

  const {
    mode,
    initialUrl,
    allowedOrigins,
    authenticationOrigins = [],
    sessionName = 'workspace',
  } = validation.value;
  if (!/^[a-zA-Z0-9._-]+$/.test(sessionName)) {
    throw new ConfigurationError('Configuration sessionName contains unsupported characters.');
  }
  const parsedInitialUrl = parseInitialUrl(initialUrl, mode);
  const normalizedAllowedOrigins = parseOrigins(allowedOrigins, 'allowedOrigins');
  const normalizedAuthenticationOrigins =
    authenticationOrigins.length === 0
      ? []
      : parseOrigins(authenticationOrigins, 'authenticationOrigins');

  if (
    mode === 'production' &&
    [...normalizedAllowedOrigins, ...normalizedAuthenticationOrigins].some(
      (origin) => !origin.startsWith('https:'),
    )
  ) {
    throw new ConfigurationError('Production origins must use HTTPS.');
  }

  if (parsedInitialUrl === undefined) {
    if (normalizedAllowedOrigins.length > 0) {
      throw new ConfigurationError('Allowed origins require an initial content URL.');
    }
  } else {
    if (!normalizedAllowedOrigins.includes(parsedInitialUrl.origin)) {
      throw new ConfigurationError('The initial content URL origin must be allowlisted.');
    }
    if (normalizedAllowedOrigins.some((origin) => origin !== parsedInitialUrl.origin)) {
      throw new ConfigurationError('Allowed origins may contain only the initial content origin.');
    }
  }

  const development: DevelopmentConfig = {
    enableDevTools: input.enableDevTools ?? mode !== 'production',
    allowArbitraryNavigation: input.allowArbitraryNavigation ?? false,
  };

  if (
    mode === 'production' &&
    (development.enableDevTools || development.allowArbitraryNavigation)
  ) {
    throw new ConfigurationError('Production development capabilities must be disabled.');
  }

  const content: ContentConfig = {
    ...(parsedInitialUrl === undefined ? {} : { initialUrl: parsedInitialUrl.toString() }),
    allowedOrigins: parsedInitialUrl === undefined ? [] : [parsedInitialUrl.origin],
    authenticationOrigins: normalizedAuthenticationOrigins,
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
  const origin = new URL(workspaceUrl).origin;
  return createAppConfig({
    mode: config.mode,
    initialUrl: workspaceUrl,
    allowedOrigins: [origin],
    authenticationOrigins: config.content.authenticationOrigins,
    enableDevTools: config.development.enableDevTools,
    allowArbitraryNavigation: config.development.allowArbitraryNavigation,
    persistSession: config.session.persist,
    sessionName: config.session.partition.replace(/^persist:/, ''),
  });
}

const TEST_DEFAULT_URL = 'http://127.0.0.1:4311/';

function readList(
  environment: NodeJS.ProcessEnv,
  key: string,
  fallback: readonly string[],
): readonly string[] {
  const raw = environment[key];
  if (raw === undefined) {
    return fallback;
  }
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

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
    configuredUrl !== undefined && configuredUrl.length > 0
      ? configuredUrl
      : mode === 'test'
        ? TEST_DEFAULT_URL
        : undefined;
  let initialOrigin: string;
  if (initialUrl === undefined) {
    initialOrigin = '';
  } else {
    try {
      initialOrigin = new URL(initialUrl).origin;
    } catch {
      throw new ConfigurationError('APP_CONTENT_URL must be a valid URL.');
    }
  }

  return createAppConfig({
    mode,
    ...(initialUrl === undefined ? {} : { initialUrl }),
    allowedOrigins: initialOrigin.length === 0 ? [] : [initialOrigin],
    authenticationOrigins: readList(environment, 'APP_AUTHENTICATION_ORIGINS', []),
    enableDevTools: readBoolean(environment, 'APP_ENABLE_DEVTOOLS', mode !== 'production'),
    allowArbitraryNavigation: readBoolean(environment, 'APP_ALLOW_ARBITRARY_NAVIGATION', false),
    persistSession: readBoolean(environment, 'APP_PERSIST_SESSION', false),
    ...(environment.APP_SESSION_NAME === undefined
      ? {}
      : { sessionName: environment.APP_SESSION_NAME }),
  });
}
