import type {
  AppPreferencesV1,
  CommandId,
  PersistedWindowState,
  ShortcutBinding,
  ShortcutModifier,
  SettingsDraft,
  ValidationResult,
} from '../../shared/types';
import { isCommandId, shortcutBindingKey } from '../../shared/commands';
import { validatePersistedWindowState } from './ipc-validation';

const shortcutModifiers = new Set<ShortcutModifier>(['alt', 'control', 'meta', 'shift']);
const shortcutCodes =
  /^(?:Key[A-Z]|Digit[0-9]|F(?:[1-9]|1[0-2])|Comma|Equal|Minus|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight|Backslash|Backquote|Enter|Space|Tab|Backspace|Delete|Home|End|PageUp|PageDown|Arrow(?:Up|Down|Left|Right))$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function validateShortcutBinding(input: unknown): ValidationResult<ShortcutBinding> {
  if (!isRecord(input) || Object.keys(input).some((key) => key !== 'code' && key !== 'modifiers')) {
    return { success: false, error: 'Shortcut binding must contain only code and modifiers.' };
  }

  if (typeof input.code !== 'string' || !shortcutCodes.test(input.code)) {
    return { success: false, error: 'Shortcut binding has an unsupported key code.' };
  }
  if (!Array.isArray(input.modifiers)) {
    return { success: false, error: 'Shortcut binding modifiers must be an array.' };
  }

  const modifiers: ShortcutModifier[] = [];
  for (const value of input.modifiers) {
    if (typeof value !== 'string' || !shortcutModifiers.has(value as ShortcutModifier)) {
      return { success: false, error: 'Shortcut binding contains an unsupported modifier.' };
    }
    const modifier = value as ShortcutModifier;
    if (modifiers.includes(modifier)) {
      return { success: false, error: 'Shortcut binding contains duplicate modifiers.' };
    }
    modifiers.push(modifier);
  }

  if (modifiers.length === 0 && !input.code.startsWith('F')) {
    return { success: false, error: 'Printable shortcuts must include a modifier.' };
  }

  return {
    success: true,
    value: {
      code: input.code,
      modifiers: [...modifiers].sort(),
    },
  };
}

export function normalizeWorkspaceUrl(value: unknown): ValidationResult<string> {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { success: false, error: 'Workspace URL must be a non-empty string.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { success: false, error: 'Workspace URL must be a valid URL.' };
  }
  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    parsed.hostname.length === 0
  ) {
    return { success: false, error: 'Workspace URL must use HTTP(S) and include a host.' };
  }
  if (parsed.username || parsed.password) {
    return { success: false, error: 'Workspace URL must not contain credentials.' };
  }
  return { success: true, value: parsed.toString() };
}

export interface SanitizedPreferences {
  readonly preferences: AppPreferencesV1;
  readonly issues: readonly string[];
}

export function validateSettingsDraft(input: unknown): ValidationResult<SettingsDraft> {
  if (
    !isRecord(input) ||
    Object.keys(input).some((key) => key !== 'workspaceUrl' && key !== 'shortcuts')
  ) {
    return { success: false, error: 'Settings draft contains an unknown field.' };
  }
  const workspaceUrl = normalizeWorkspaceUrl(input.workspaceUrl);
  if (!workspaceUrl.success) {
    return workspaceUrl;
  }
  if (!isRecord(input.shortcuts)) {
    return { success: false, error: 'Settings shortcuts must be an object.' };
  }

  const shortcuts: Partial<Record<CommandId, ShortcutBinding>> = {};
  for (const [commandId, value] of Object.entries(input.shortcuts)) {
    if (!isCommandId(commandId)) {
      return { success: false, error: `Unknown shortcut command: ${commandId}.` };
    }
    const binding = validateShortcutBinding(value);
    if (!binding.success) {
      return { success: false, error: `${commandId}: ${binding.error}` };
    }
    shortcuts[commandId] = binding.value;
  }

  return { success: true, value: { workspaceUrl: workspaceUrl.value, shortcuts } };
}

function fallbackPreferences(window: PersistedWindowState): AppPreferencesV1 {
  return {
    version: 1,
    shortcuts: {},
    window,
  };
}

export function sanitizeAppPreferences(
  input: unknown,
  fallbackWindow: PersistedWindowState,
): SanitizedPreferences {
  const issues: string[] = [];
  const fallback = fallbackPreferences(fallbackWindow);
  if (!isRecord(input)) {
    return { preferences: fallback, issues: ['Preferences must be an object.'] };
  }
  if (input.version !== 1) {
    return { preferences: fallback, issues: ['Preferences version is unsupported.'] };
  }

  let workspaceUrl: string | undefined;
  if (input.workspaceUrl !== undefined) {
    const validation = normalizeWorkspaceUrl(input.workspaceUrl);
    if (validation.success) {
      workspaceUrl = validation.value;
    } else {
      issues.push(validation.error);
    }
  }

  let window = fallbackWindow;
  if (input.window !== undefined) {
    const validation = validatePersistedWindowState(input.window);
    if (validation.success) {
      window = validation.value;
    } else {
      issues.push(validation.error);
    }
  } else {
    issues.push('Preferences window state is missing.');
  }

  const shortcuts: Partial<Record<CommandId, ShortcutBinding>> = {};
  if (!isRecord(input.shortcuts)) {
    issues.push('Preferences shortcuts must be an object.');
  } else {
    const seen = new Set<string>();
    for (const [commandId, value] of Object.entries(input.shortcuts)) {
      if (!isCommandId(commandId)) {
        issues.push(`Unknown shortcut command: ${commandId}.`);
        continue;
      }
      const validation = validateShortcutBinding(value);
      if (!validation.success) {
        issues.push(`${commandId}: ${validation.error}`);
        continue;
      }
      const key = shortcutBindingKey(validation.value);
      if (seen.has(key)) {
        issues.push(`${commandId}: duplicate shortcut binding.`);
        continue;
      }
      seen.add(key);
      shortcuts[commandId] = validation.value;
    }
  }

  return {
    preferences: {
      version: 1,
      ...(workspaceUrl === undefined ? {} : { workspaceUrl }),
      shortcuts,
      window,
    },
    issues,
  };
}
