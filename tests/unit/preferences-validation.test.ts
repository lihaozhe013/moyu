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
  it('normalizes valid URLs and rejects credentials or unsupported schemes', () => {
    expect(normalizeWorkspaceUrl(' https://workspace.example.test/path ')).toEqual({
      success: true,
      value: 'https://workspace.example.test/path',
    });
    expect(normalizeWorkspaceUrl('https://user:secret@workspace.example.test').success).toBe(false);
    expect(normalizeWorkspaceUrl('file:///tmp/workspace').success).toBe(false);
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
    ).toMatchObject({ success: false });
  });
});
