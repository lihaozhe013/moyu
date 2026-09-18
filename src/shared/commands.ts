import type {
  CommandId,
  ShortcutBinding,
  ShortcutModifier,
} from './types';

export type CommandScope = 'application' | 'settings';
export type SupportedPlatform = 'darwin' | 'win32';

export interface CommandDefinition {
  readonly id: CommandId;
  readonly label: string;
  readonly description: string;
  readonly scope: CommandScope;
  readonly customizable: boolean;
  readonly devOnly: boolean;
  readonly defaultBinding: ShortcutBinding | undefined;
}

export interface CommandSummary {
  readonly id: CommandId;
  readonly label: string;
  readonly description: string;
  readonly scope: CommandScope;
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

function binding(code: string, modifiers: readonly ShortcutModifier[]): ShortcutBinding {
  return { code, modifiers: [...modifiers] };
}

function primary(platform: SupportedPlatform, code: string, shift = false): ShortcutBinding {
  const modifier: ShortcutModifier = platform === 'darwin' ? 'meta' : 'control';
  return binding(code, shift ? [modifier, 'shift'] : [modifier]);
}

function platformWindowBinding(
  platform: SupportedPlatform,
  code: string,
  shift = false,
): ShortcutBinding {
  if (platform === 'darwin') {
    return binding(code, shift ? ['meta', 'shift'] : ['meta']);
  }
  return binding(code, shift ? ['alt', 'shift'] : ['alt']);
}

export function createCommandDefinitions(platform: SupportedPlatform): readonly CommandDefinition[] {
  return [
    {
      id: 'settings.open',
      label: 'Open Settings',
      description: 'Open or focus the application settings window.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: primary(platform, 'Comma'),
    },
    {
      id: 'settings.save',
      label: 'Save Settings',
      description: 'Save pending settings changes.',
      scope: 'settings',
      customizable: true,
      devOnly: false,
      defaultBinding: primary(platform, 'KeyS'),
    },
    {
      id: 'palette.open',
      label: 'Open Command Palette',
      description: 'Show the keyboard command palette.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: primary(platform, 'KeyL', true),
    },
    {
      id: 'window.minimize',
      label: 'Minimize Window',
      description: 'Minimize the primary workspace window.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: platformWindowBinding(platform, 'KeyM'),
    },
    {
      id: 'window.toggleMaximize',
      label: 'Maximize or Restore Window',
      description: 'Toggle the primary workspace between maximized and windowed.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: platformWindowBinding(platform, 'KeyM', true),
    },
    {
      id: 'window.close',
      label: 'Close Window',
      description: 'Close the focused application window.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: primary(platform, 'KeyW'),
    },
    {
      id: 'app.quit',
      label: 'Quit Application',
      description: 'Quit the desktop application.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: primary(platform, 'KeyQ'),
    },
    {
      id: 'window.toggleFullscreen',
      label: 'Toggle Fullscreen',
      description: 'Enter or leave native fullscreen presentation.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding:
        platform === 'darwin' ? binding('KeyF', ['control', 'meta']) : binding('F11', []),
    },
    {
      id: 'content.reload',
      label: 'Reload Workspace',
      description: 'Reload the remote workspace content.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: primary(platform, 'KeyR'),
    },
    {
      id: 'content.hardReload',
      label: 'Hard Reload Workspace',
      description: 'Reload the remote workspace while ignoring cache.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: primary(platform, 'KeyR', true),
    },
    {
      id: 'content.zoomReset',
      label: 'Reset Content Zoom',
      description: 'Reset the workspace content zoom to 100 percent.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: primary(platform, 'Digit0'),
    },
    {
      id: 'content.zoomIn',
      label: 'Increase Content Zoom',
      description: 'Increase the workspace content zoom.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: primary(platform, 'Equal', true),
    },
    {
      id: 'content.zoomOut',
      label: 'Decrease Content Zoom',
      description: 'Decrease the workspace content zoom.',
      scope: 'application',
      customizable: true,
      devOnly: false,
      defaultBinding: primary(platform, 'Minus'),
    },
    {
      id: 'shell.about',
      label: 'About Professional Canvas',
      description: 'Show application information.',
      scope: 'application',
      customizable: false,
      devOnly: false,
      defaultBinding: undefined,
    },
    {
      id: 'shell.gpuDiagnostics',
      label: 'GPU Diagnostics',
      description: 'Show non-sensitive GPU capability diagnostics.',
      scope: 'application',
      customizable: false,
      devOnly: true,
      defaultBinding: undefined,
    },
    {
      id: 'devtools.open',
      label: 'Open Content DevTools',
      description: 'Open developer tools for the workspace content.',
      scope: 'application',
      customizable: false,
      devOnly: true,
      defaultBinding: primary(platform, 'KeyI', true),
    },
  ];
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
): string {
  if (bindingValue === undefined) {
    return 'Palette only';
  }
  const modifierLabels: Record<ShortcutModifier, string> =
    platform === 'darwin'
      ? { alt: '⌥', control: '⌃', meta: '⌘', shift: '⇧' }
      : { alt: 'Alt+', control: 'Ctrl+', meta: 'Meta+', shift: 'Shift+' };
  const modifierText = [...bindingValue.modifiers]
    .sort((left, right) => ['control', 'meta', 'alt', 'shift'].indexOf(left) - ['control', 'meta', 'alt', 'shift'].indexOf(right))
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
    .sort((left, right) => ['control', 'meta', 'alt', 'shift'].indexOf(left) - ['control', 'meta', 'alt', 'shift'].indexOf(right))
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
