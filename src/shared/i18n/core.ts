import { createInstance, type i18n } from 'i18next';
import type { AppLanguage } from './languages';
import { SUPPORTED_LANGUAGES } from './languages';
import enCommands from './locales/en/commands.json';
import enShell from './locales/en/shell.json';
import enSettings from './locales/en/settings.json';
import enMenus from './locales/en/menus.json';
import enErrors from './locales/en/errors.json';
import zhCommands from './locales/zh-CN/commands.json';
import zhShell from './locales/zh-CN/shell.json';
import zhSettings from './locales/zh-CN/settings.json';
import zhMenus from './locales/zh-CN/menus.json';
import zhErrors from './locales/zh-CN/errors.json';

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

export const I18N_NAMESPACES = ['commands', 'shell', 'settings', 'menus', 'errors'] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const localeResources = {
  en: {
    commands: enCommands,
    shell: enShell,
    settings: enSettings,
    menus: enMenus,
    errors: enErrors,
  },
  'zh-CN': {
    commands: zhCommands,
    shell: zhShell,
    settings: zhSettings,
    menus: zhMenus,
    errors: zhErrors,
  },
};

// Resources are bundled inline, so init() and changeLanguage() resolve synchronously.
export function createI18nInstance(language: AppLanguage = DEFAULT_LANGUAGE): i18n {
  const instance = createInstance();
  void instance.init({
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    resources: localeResources,
    ns: [...I18N_NAMESPACES],
    defaultNS: 'shell',
    interpolation: { escapeValue: false },
  });
  return instance;
}
