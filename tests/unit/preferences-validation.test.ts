import { describe, expect, it } from 'vitest';
import type { PersistedWindowState } from '../../src/shared/types';
import {
  normalizeWorkspaceUrl,
  sanitizeAppPreferences,
  validateSettingsDraft,
  validateShortcutBinding,
} from '../../src/main/security/preferences-validation';

const fallbackWindow: PersistedWindowState = {
  width: 1600,
  height: 1000,
  x: 20,
  y: 30,
  maximized: false,
};

describe('preference validation', () => {
  it('normalizes any URL that the URL parser accepts', () => {
    expect(normalizeWorkspaceUrl(' https://workspace.example.test/path ')).toEqual({
      success: true,
      value: 'https://workspace.example.test/path',
    });
    expect(normalizeWorkspaceUrl('https://user:secret@workspace.example.test').success).toBe(true);
    expect(normalizeWorkspaceUrl('file:///tmp/workspace').success).toBe(true);
    expect(normalizeWorkspaceUrl('data:text/html,<h1>workspace</h1>').success).toBe(true);
  });

  it('recovers valid fields from partially corrupt preferences', () => {
    const result = sanitizeAppPreferences(
      {
        version: 1,
        workspaceUrl: 'https://workspace.example.test/workspace',
        window: { width: -1, height: 1000, maximized: false },
        shortcuts: {
          'content.reload': { code: 'KeyK', modifiers: ['control'] },
          unknown: { code: 'KeyU', modifiers: ['control'] },
          'content.zoomIn': { code: 'KeyZ', modifiers: [] },
        },
      },
      fallbackWindow,
    );

    expect(result.preferences.workspaceUrl).toBe('https://workspace.example.test/workspace');
    expect(result.preferences.window).toEqual(fallbackWindow);
    expect(result.preferences.shortcuts).toEqual({
      'content.reload': { code: 'KeyK', modifiers: ['control'] },
    });
    expect(result.issues.length).toBe(3);
  });

  it('recovers valid window fields independently', () => {
    const result = sanitizeAppPreferences(
      {
        version: 1,
        window: { width: -1, height: 720, x: 44, maximized: false },
        shortcuts: {},
      },
      fallbackWindow,
    );

    expect(result.preferences.window).toEqual({
      width: fallbackWindow.width,
      height: 720,
      x: 44,
      y: fallbackWindow.y,
      maximized: false,
    });
  });

  it('keeps malformed shortcut input out of persisted state', () => {
    expect(validateShortcutBinding({ code: 'KeyA', modifiers: ['meta', 'alt'] })).toEqual({
      success: true,
      value: { code: 'KeyA', modifiers: ['alt', 'meta'] },
    });
    expect(validateShortcutBinding({ code: 'KeyA', modifiers: ['hyper'] }).success).toBe(false);
  });

  it('validates complete settings drafts before they reach persistence', () => {
    expect(
      validateSettingsDraft({
        workspaceUrl: 'https://workspace.example.test/new',
        shortcuts: {
          'content.reload': { code: 'KeyK', modifiers: ['control'] },
        },
      }),
    ).toEqual({
      success: true,
      value: {
        workspaceUrl: 'https://workspace.example.test/new',
        shortcuts: {
          'content.reload': { code: 'KeyK', modifiers: ['control'] },
        },
      },
    });
    expect(
      validateSettingsDraft({ workspaceUrl: 'https://user:pass@example.test/', shortcuts: {} }),
    ).toMatchObject({ success: true });
  });

  it('carries the language preference through drafts and persistence', () => {
    expect(
      validateSettingsDraft({
        workspaceUrl: 'https://workspace.example.test/',
        language: 'zh-CN',
        shortcuts: {},
      }),
    ).toMatchObject({ success: true, value: { language: 'zh-CN' } });
    expect(
      validateSettingsDraft({
        workspaceUrl: 'https://workspace.example.test/',
        language: 'fr',
        shortcuts: {},
      }).success,
    ).toBe(false);

    const result = sanitizeAppPreferences(
      { version: 1, shortcuts: {}, window: fallbackWindow, language: 'zh-CN' },
      fallbackWindow,
    );
    expect(result.preferences.language).toBe('zh-CN');
    expect(result.issues).toHaveLength(0);

    const invalid = sanitizeAppPreferences(
      { version: 1, shortcuts: {}, window: fallbackWindow, language: 'de' },
      fallbackWindow,
    );
    expect(invalid.preferences.language).toBeUndefined();
    expect(invalid.issues).toContain('Preferences language is invalid.');
  });
});
