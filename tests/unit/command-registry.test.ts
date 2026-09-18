import { describe, expect, it } from 'vitest';
import { createCommandDefinitions, shortcutBindingKey } from '../../src/shared/commands';
import {
  createCommandRegistry,
  validateCommandOverrides,
} from '../../src/main/commands/command-registry';
import { validateShortcutBinding } from '../../src/main/security/preferences-validation';

describe('command registry contracts', () => {
  it('uses the platform-specific window defaults', () => {
    const mac = createCommandDefinitions('darwin');
    const windows = createCommandDefinitions('win32');
    const macMinimize = mac.find((definition) => definition.id === 'window.minimize');
    const windowsMinimize = windows.find((definition) => definition.id === 'window.minimize');

    expect(macMinimize?.defaultBinding).toEqual({ code: 'KeyM', modifiers: ['meta'] });
    expect(windowsMinimize?.defaultBinding).toEqual({ code: 'KeyM', modifiers: ['control'] });

    const macDrag = mac.find((definition) => definition.id === 'window.toggleDrag');
    expect(macDrag).toMatchObject({
      scope: 'workspace',
      activation: 'press',
      customizable: true,
      defaultBinding: undefined,
    });

    const macIds: readonly string[] = mac.map((definition) => definition.id);
    const windowsIds: readonly string[] = windows.map((definition) => definition.id);
    expect(macIds).not.toContain('window.drag');
    expect(windowsIds).not.toContain('window.drag');
  });

  it('rejects unsafe shortcut shapes', () => {
    expect(validateShortcutBinding({ code: 'KeyK', modifiers: [] }).success).toBe(false);
    expect(
      validateShortcutBinding({ code: 'KeyK', modifiers: ['control', 'control'] }).success,
    ).toBe(false);
    expect(validateShortcutBinding({ code: 'F11', modifiers: [] })).toMatchObject({
      success: true,
      value: { code: 'F11', modifiers: [] },
    });
  });

  it('rejects duplicate overrides and retains defaults for untouched commands', () => {
    const definitions = createCommandDefinitions('win32');
    const validation = validateCommandOverrides(definitions, {
      'content.reload': { code: 'F2', modifiers: [] },
      'content.hardReload': { code: 'F2', modifiers: [] },
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.join(' ')).toContain('content.hardReload conflicts');

    const registry = createCommandRegistry('win32');
    expect(registry.getBinding('content.reload')).toEqual({
      code: 'KeyR',
      modifiers: ['control'],
    });
  });

  it('matches configured bindings for the active surface', () => {
    const registry = createCommandRegistry('win32', {
      'content.reload': { code: 'KeyK', modifiers: ['control'] },
    });

    expect(
      registry.match(
        { code: 'KeyK', alt: false, control: true, meta: false, shift: false },
        'workspace',
        false,
      ),
    ).toBe('content.reload');
    expect(
      registry.match(
        { code: 'KeyS', alt: false, control: true, meta: false, shift: false },
        'workspace',
        false,
      ),
    ).toBeUndefined();
    expect(
      registry.match(
        { code: 'KeyS', alt: false, control: true, meta: false, shift: false },
        'settings',
        false,
      ),
    ).toBeUndefined();
    expect(
      registry.match(
        { code: 'Comma', alt: false, control: true, meta: false, shift: false },
        'settings',
        false,
      ),
    ).toBe('settings.open');
    expect(
      registry.match(
        { code: 'KeyZ', alt: false, control: true, meta: false, shift: true },
        'workspace',
        false,
      ),
    ).toBeUndefined();
    expect(
      registry.match(
        { code: 'KeyZ', alt: false, control: true, meta: false, shift: true },
        'settings',
        false,
      ),
    ).toBeUndefined();
    expect(registry.getActivation('content.reload')).toBe('press');
  });

  it('normalizes modifier order for stable persistence keys', () => {
    expect(shortcutBindingKey({ code: 'KeyK', modifiers: ['shift', 'control'] })).toBe(
      shortcutBindingKey({ code: 'KeyK', modifiers: ['control', 'shift'] }),
    );
  });
});
