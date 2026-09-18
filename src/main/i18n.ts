import { createI18nInstance, DEFAULT_LANGUAGE } from '../shared/i18n/core';
import {
  resolveLanguagePreference,
  type AppLanguage,
  type LanguagePreference,
} from '../shared/i18n/languages';
import type { LanguageState } from '../shared/types';

const mainI18n = createI18nInstance(DEFAULT_LANGUAGE);
let systemLocale: string | undefined;
let preference: LanguagePreference = 'system';
let resolved: AppLanguage = DEFAULT_LANGUAGE;

export function applyLanguagePreference(next: LanguagePreference): LanguageState {
  preference = next;
  resolved = resolveLanguagePreference(next, systemLocale);
  if (mainI18n.language !== resolved) {
    void mainI18n.changeLanguage(resolved);
  }
  return getLanguageState();
}

export function initMainLocale(
  preferenceArg: LanguagePreference,
  systemLocaleArg: string,
): LanguageState {
  systemLocale = systemLocaleArg;
  return applyLanguagePreference(preferenceArg);
}

export function getLanguageState(): LanguageState {
  return { preference, resolved };
}

// Keys reach this module at runtime (command IDs, menu lookups), so they live
// outside the compile-time resource surface.
const dynamicT = mainI18n.t as unknown as (
  key: string,
  options?: Record<string, unknown>,
) => string;

export function translate(key: string, options?: Record<string, unknown>): string {
  return options === undefined ? dynamicT(key) : dynamicT(key, options);
}
