import type { CommandId, ShortcutBinding, ShortcutModifier } from './types';
import defaultShortcutsJson from './shortcuts.defaults.json';

export type CommandScope = 'application' | 'settings' | 'workspace';
export type CommandActivation = 'press' | 'hold';
export type SupportedPlatform = 'darwin' | 'win32';

// Localized text is resolved by callers through the `commands` i18n namespace,
// keyed as `commands:<id>.label` and `commands:<id>.description`.
export interface CommandDefinition {
  readonly id: CommandId;
  readonly scope: CommandScope;
  readonly activation: CommandActivation;
  readonly customizable: boolean;
  readonly devOnly: boolean;
  readonly defaultBinding: ShortcutBinding | undefined;
}

export interface CommandSummary {
  readonly id: CommandId;
  readonly label: string;
  readonly description: string;
  readonly scope: CommandScope;
  readonly activation: CommandActivation;
  readonly customizable: boolean;
  readonly devOnly: boolean;
  readonly defaultBinding: ShortcutBinding | undefined;
  readonly binding: ShortcutBinding | undefined;
}

export interface ShortcutInput {
  readonly code: string;
  readonly alt: boolean;
  readonly control: boolean;
  readonly meta: boolean;
  readonly shift: boolean;
}

export const COMMAND_IDS: readonly CommandId[] = [
  'settings.open',
  'settings.save',
  'palette.open',
  'window.drag',
  'window.minimize',
  'window.toggleMaximize',
  'window.close',
  'app.quit',
  'window.toggleFullscreen',
  'content.reload',
  'content.hardReload',
  'content.zoomReset',
  'content.zoomIn',
  'content.zoomOut',
  'shell.about',
  'shell.gpuDiagnostics',
  'devtools.open',
];

export function isCommandId(value: string): value is CommandId {
  return COMMAND_IDS.includes(value as CommandId);
}

interface ShortcutBindingJson {
  readonly code: string;
  readonly modifiers: readonly string[];
}

interface CommandDefaultShortcuts {
  readonly darwin: ShortcutBindingJson | null;
  readonly win32: ShortcutBindingJson | null;
}

// The JSON file is the source of truth for default bindings. The annotation
// forces compile-time completeness against `CommandId`; the paired unit test
// validates every binding shape at test time.
const DEFAULT_SHORTCUTS: Record<CommandId, CommandDefaultShortcuts> = defaultShortcutsJson;

function shortcutBindingFromJson(value: ShortcutBindingJson | null): ShortcutBinding | undefined {
  if (value === null) {
    return undefined;
  }
  return { code: value.code, modifiers: value.modifiers as readonly ShortcutModifier[] };
}

type CommandMetadata = Omit<CommandDefinition, 'defaultBinding'>;

const COMMAND_METADATA: readonly CommandMetadata[] = [
  {
    id: 'settings.open',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'settings.save',
    scope: 'settings',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'palette.open',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'window.minimize',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'window.toggleMaximize',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'window.close',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'app.quit',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'window.toggleFullscreen',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'content.reload',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'content.hardReload',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'content.zoomReset',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'content.zoomIn',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'content.zoomOut',
    scope: 'application',
    activation: 'press',
    customizable: true,
    devOnly: false,
  },
  {
    id: 'shell.about',
    scope: 'application',
    activation: 'press',
    customizable: false,
    devOnly: false,
  },
  {
    id: 'shell.gpuDiagnostics',
    scope: 'application',
    activation: 'press',
    customizable: false,
    devOnly: true,
  },
  {
    id: 'devtools.open',
    scope: 'application',
    activation: 'press',
    customizable: false,
    devOnly: true,
  },
  {
    id: 'window.drag',
    scope: 'workspace',
    activation: 'hold',
    customizable: true,
    devOnly: false,
  },
];

export function createCommandDefinitions(
  platform: SupportedPlatform,
): readonly CommandDefinition[] {
  return COMMAND_METADATA.map((metadata) => ({
    ...metadata,
    defaultBinding: shortcutBindingFromJson(DEFAULT_SHORTCUTS[metadata.id][platform]),
  }));
}

export function shortcutBindingKey(bindingValue: ShortcutBinding): string {
  return `${[...bindingValue.modifiers].sort().join('+')}|${bindingValue.code}`;
}

export function shortcutBindingEquals(
  left: ShortcutBinding | undefined,
  right: ShortcutBinding | undefined,
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return shortcutBindingKey(left) === shortcutBindingKey(right);
}

export function shortcutBindingFromInput(input: ShortcutInput): ShortcutBinding {
  const modifiers: ShortcutModifier[] = [];
  if (input.alt) {
    modifiers.push('alt');
  }
  if (input.control) {
    modifiers.push('control');
  }
  if (input.meta) {
    modifiers.push('meta');
  }
  if (input.shift) {
    modifiers.push('shift');
  }
  return { code: input.code, modifiers };
}

export function shortcutBindingMatchesInput(
  bindingValue: ShortcutBinding,
  input: ShortcutInput,
): boolean {
  return shortcutBindingEquals(bindingValue, shortcutBindingFromInput(input));
}

export function formatShortcutBinding(
  bindingValue: ShortcutBinding | undefined,
  platform: SupportedPlatform = 'win32',
  paletteOnlyLabel = 'Palette only',
): string {
  if (bindingValue === undefined) {
    return paletteOnlyLabel;
  }
  const modifierLabels: Record<ShortcutModifier, string> =
    platform === 'darwin'
      ? { alt: '⌥', control: '⌃', meta: '⌘', shift: '⇧' }
      : { alt: 'Alt+', control: 'Ctrl+', meta: 'Meta+', shift: 'Shift+' };
  const modifierText = [...bindingValue.modifiers]
    .sort(
      (left, right) =>
        ['control', 'meta', 'alt', 'shift'].indexOf(left) -
        ['control', 'meta', 'alt', 'shift'].indexOf(right),
    )
    .map((modifier) => modifierLabels[modifier])
    .join(platform === 'darwin' ? '' : '');
  const keyLabels: Record<string, string> = {
    Comma: ',',
    Equal: '+',
    Minus: '-',
    Space: 'Space',
    F11: 'F11',
  };
  const key = keyLabels[bindingValue.code] ?? bindingValue.code.replace(/^Key|^Digit/, '');
  return `${modifierText}${key}`;
}

export function toElectronAccelerator(
  bindingValue: ShortcutBinding | undefined,
  platform: SupportedPlatform,
): string | undefined {
  if (bindingValue === undefined) {
    return undefined;
  }
  const modifierLabels: Record<ShortcutModifier, string> =
    platform === 'darwin'
      ? { alt: 'Alt', control: 'Ctrl', meta: 'Command', shift: 'Shift' }
      : { alt: 'Alt', control: 'Ctrl', meta: 'Super', shift: 'Shift' };
  const modifiers = [...bindingValue.modifiers]
    .sort(
      (left, right) =>
        ['control', 'meta', 'alt', 'shift'].indexOf(left) -
        ['control', 'meta', 'alt', 'shift'].indexOf(right),
    )
    .map((modifier) => modifierLabels[modifier]);
  const keyLabels: Record<string, string> = {
    Comma: ',',
    Equal: '+',
    Minus: '-',
    Period: '.',
    Slash: '/',
    Space: 'Space',
  };
  const key = keyLabels[bindingValue.code] ?? bindingValue.code.replace(/^Key|^Digit/, '');
  return [...modifiers, key].join('+');
}
