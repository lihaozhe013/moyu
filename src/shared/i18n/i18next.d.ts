import type enCommands from './locales/en/commands.json';
import type enShell from './locales/en/shell.json';
import type enSettings from './locales/en/settings.json';
import type enMenus from './locales/en/menus.json';
import type enErrors from './locales/en/errors.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'shell';
    resources: {
      commands: typeof enCommands;
      shell: typeof enShell;
      settings: typeof enSettings;
      menus: typeof enMenus;
      errors: typeof enErrors;
    };
  }
}

export {};
