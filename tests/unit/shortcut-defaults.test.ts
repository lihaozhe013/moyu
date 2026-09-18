import { describe, expect, it } from 'vitest';
import defaultShortcuts from '../../src/shared/shortcuts.defaults.json';
import {
  COMMAND_IDS,
  createCommandDefinitions,
  isCommandId,
  shortcutBindingKey,
} from '../../src/shared/commands';
import type { ShortcutBinding } from '../../src/shared/types';
import { validateShortcutBinding } from '../../src/main/security/preferences-validation';

const defaults = defaultShortcuts as Record<string, unknown>;

describe('shortcut defaults data file', () => {
  it('covers every command id exactly once', () => {
    const keys = Object.keys(defaults);
    expect(keys).toHaveLength(COMMAND_IDS.length);
    for (const key of keys) {
      expect(isCommandId(key), `unknown command id in defaults: ${key}`).toBe(true);
    }
    for (const id of COMMAND_IDS) {
      expect(defaults, `missing defaults for ${id}`).toHaveProperty(id);
    }
  });

  it('provides valid per-platform bindings or explicit null', () => {
    for (const id of COMMAND_IDS) {
      const entry = defaults[id] as Record<string, unknown>;
      for (const platform of ['darwin', 'win32'] as const) {
        const value = entry[platform];
        expect(value, `${id}.${platform} must be an object or null`).not.toBeUndefined();
        if (value === null) {
          continue;
        }
        const binding = value as { code: string; modifiers: string[] };
        expect(typeof binding.code).toBe('string');
        expect(Array.isArray(binding.modifiers)).toBe(true);
        const validation = validateShortcutBinding({
          code: binding.code,
          modifiers: binding.modifiers as ShortcutBinding['modifiers'],
        });
        expect(validation.success, `${id}.${platform}: invalid shortcut binding`).toBe(true);
      }
    }
  });

  it('keeps defaults conflict-free on every platform', () => {
    for (const platform of ['darwin', 'win32'] as const) {
      const seen = new Map<string, string>();
      for (const definition of createCommandDefinitions(platform)) {
        if (definition.defaultBinding === undefined) {
          continue;
        }
        const key = shortcutBindingKey(definition.defaultBinding);
        expect(seen.has(key), `${platform}: ${definition.id} conflicts with ${seen.get(key)}`).toBe(
          false,
        );
        seen.set(key, definition.id);
      }
    }
  });
});
