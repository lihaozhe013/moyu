import { describe, expect, it } from 'vitest';
import { I18N_NAMESPACES, localeResources } from '../../src/shared/i18n/core';
import {
  languageFromSystemLocale,
  resolveLanguagePreference,
} from '../../src/shared/i18n/languages';
import { COMMAND_IDS } from '../../src/shared/commands';
import { createCommandRegistry } from '../../src/main/commands/command-registry';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix.length === 0 ? key : `${prefix}.${key}`),
  );
}

describe('locale resources', () => {
  it('keeps English and Simplified Chinese key sets aligned', () => {
    for (const namespace of I18N_NAMESPACES) {
      const enKeys = flattenKeys(localeResources.en[namespace], namespace).sort();
      const zhKeys = flattenKeys(localeResources['zh-CN'][namespace], namespace).sort();
      expect(enKeys).toEqual(zhKeys);
      expect(enKeys.length).toBeGreaterThan(0);
    }
  });

  it('provides non-empty labels and descriptions for every command', () => {
    for (const language of ['en', 'zh-CN'] as const) {
      const commands = localeResources[language].commands as unknown as Record<
        string,
        { label?: string; description?: string } | undefined
      >;
      for (const id of COMMAND_IDS) {
        const entry = commands[id];
        expect(typeof entry?.label).toBe('string');
        expect((entry?.label?.length ?? 0) > 0).toBe(true);
        expect((entry?.description?.length ?? 0) > 0).toBe(true);
      }
    }
  });
});

describe('language resolution', () => {
  it('maps Chinese system locales to Simplified Chinese and everything else to English', () => {
    expect(languageFromSystemLocale('zh-CN')).toBe('zh-CN');
    expect(languageFromSystemLocale('zh_TW')).toBe('zh-CN');
    expect(languageFromSystemLocale('en-US')).toBe('en');
    expect(languageFromSystemLocale(undefined)).toBe('en');
  });

  it('prefers explicit selections over the system locale', () => {
    expect(resolveLanguagePreference('en', 'zh-CN')).toBe('en');
    expect(resolveLanguagePreference('zh-CN', 'en-US')).toBe('zh-CN');
    expect(resolveLanguagePreference('system', 'zh-CN')).toBe('zh-CN');
    expect(resolveLanguagePreference(undefined, 'zh-CN')).toBe('zh-CN');
  });
});

describe('command registry localization', () => {
  it('resolves summaries through the main-process translator', () => {
    const registry = createCommandRegistry('win32');
    const reload = registry.getSummaries().find((command) => command.id === 'content.reload');
    expect(reload?.label).toBe('Reload Workspace');
  });
});
