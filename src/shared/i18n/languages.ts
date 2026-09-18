export const SUPPORTED_LANGUAGES = ['en', 'zh-CN'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type LanguagePreference = AppLanguage | 'system';

export const LANGUAGE_PREFERENCES: readonly LanguagePreference[] = [
  ...SUPPORTED_LANGUAGES,
  'system',
];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return typeof value === 'string' && (LANGUAGE_PREFERENCES as readonly string[]).includes(value);
}

export function languageFromSystemLocale(locale: string | undefined): AppLanguage {
  if (locale !== undefined && /^zh(?:[-_]|$)/i.test(locale)) {
    return 'zh-CN';
  }
  return 'en';
}

export function resolveLanguagePreference(
  preference: LanguagePreference | undefined,
  systemLocale: string | undefined,
): AppLanguage {
  if (preference === undefined || preference === 'system') {
    return languageFromSystemLocale(systemLocale);
  }
  return preference;
}
