import type {
  AppConfig,
  AppMode,
  ContentConfig,
  DevelopmentConfig,
  ValidationResult,
} from '../../shared/types';
import { normalizeOrigin } from '../navigation/allowed-origins';

export interface AppConfigInput {
  readonly mode: AppMode;
  readonly initialUrl: string;
  readonly allowedOrigins: readonly string[];
  readonly authenticationOrigins?: readonly string[];
  readonly enableDevTools?: boolean;
  readonly allowArbitraryNavigation?: boolean;
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

function parseInitialUrl(value: string, mode: AppMode): URL {
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
  if (values.length === 0) {
    throw new ConfigurationError(`${fieldName} must contain at least one origin.`);
  }

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
  ]);
  if (Object.keys(candidate).some((key) => !allowedKeys.has(key))) {
    return { success: false, error: 'Configuration contains an unknown field.' };
  }
  if (!isAppMode(candidate.mode)) {
    return { success: false, error: 'Configuration mode is invalid.' };
  }
  if (typeof candidate.initialUrl !== 'string' || candidate.initialUrl.length === 0) {
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
  ] as const) {
    if (value !== undefined && typeof value !== 'boolean') {
      return { success: false, error: `Configuration ${name} must be a boolean.` };
    }
  }

  const enableDevTools = candidate.enableDevTools;
  const allowArbitraryNavigation = candidate.allowArbitraryNavigation;

  return {
    success: true,
    value: {
      mode: candidate.mode,
      initialUrl: candidate.initialUrl,
      allowedOrigins: candidate.allowedOrigins as string[],
      ...(authenticationOrigins === undefined
        ? {}
        : { authenticationOrigins: authenticationOrigins as string[] }),
      ...(enableDevTools === undefined ? {} : { enableDevTools: enableDevTools as boolean }),
      ...(allowArbitraryNavigation === undefined
        ? {}
        : { allowArbitraryNavigation: allowArbitraryNavigation as boolean }),
    },
  };
}

export function createAppConfig(input: AppConfigInput): AppConfig {
  const validation = validateAppConfigInput(input);
  if (!validation.success) {
    throw new ConfigurationError(validation.error);
  }

  const { mode, initialUrl, allowedOrigins, authenticationOrigins = [] } = validation.value;
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

  if (!normalizedAllowedOrigins.includes(parsedInitialUrl.origin)) {
    throw new ConfigurationError('The initial content URL origin must be allowlisted.');
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
    initialUrl: parsedInitialUrl.toString(),
    allowedOrigins: normalizedAllowedOrigins,
    authenticationOrigins: normalizedAuthenticationOrigins,
  };

  return { mode, content, development };
}
