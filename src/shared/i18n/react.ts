import type { i18n } from 'i18next';
import { createI18nInstance } from './core';
import { languageFromSystemLocale, type AppLanguage } from './languages';

export function createRendererI18n(initial?: AppLanguage): i18n {
  return createI18nInstance(initial ?? languageFromSystemLocale(navigator.language));
}
