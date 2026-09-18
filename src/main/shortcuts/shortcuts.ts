import type { WebContents } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';
import type { AppConfig, CommandId, ShortcutBinding, ShortcutModifier } from '../../shared/types';
import {
  shortcutBindingEquals,
  shortcutBindingFromInput,
  type ShortcutInput,
} from '../../shared/commands';
import type { CommandRegistry, CommandSurface } from '../commands/command-registry';

export interface ShortcutActions {
  readonly executeCommand: (commandId: CommandId) => void;
  readonly dismissOverlays: () => void;
  readonly setHoldMode?: (active: boolean) => void;
  readonly isHoldModeActive?: () => boolean;
  readonly isCapturing?: () => boolean;
}

interface ShortcutHoldState {
  activeBinding: ShortcutBinding | undefined;
}

interface BeforeInputEvent {
  readonly type: string;
  readonly key: string;
  readonly code?: string;
  readonly alt: boolean;
  readonly control: boolean;
  readonly meta: boolean;
  readonly shift: boolean;
  readonly isAutoRepeat?: boolean;
}

function normalizeCode(input: BeforeInputEvent): string {
  if (input.code !== undefined && input.code.length > 0) {
    if (/^[a-z]$/i.test(input.code)) {
      return `Key${input.code.toUpperCase()}`;
    }
    if (/^[0-9]$/.test(input.code)) {
      return `Digit${input.code}`;
    }
    return input.code;
  }
  if (input.key === '+' || input.key === '=') {
    return 'Equal';
  }
  if (input.key === '-') {
    return 'Minus';
  }
  if (input.key === ',') {
    return 'Comma';
  }
  if (input.key === ' ' || input.key === 'Spacebar') {
    return 'Space';
  }
  if (/^F(?:[1-9]|1[0-2])$/.test(input.key)) {
    return input.key;
  }
  if (/^[a-z]$/i.test(input.key)) {
    return `Key${input.key.toUpperCase()}`;
  }
  if (/^[0-9]$/.test(input.key)) {
    return `Digit${input.key}`;
  }
  return input.key;
}

function modifierForInput(input: BeforeInputEvent): ShortcutModifier | undefined {
  const code = input.code ?? input.key;
  if (code === 'AltLeft' || code === 'AltRight' || input.key === 'Alt') {
    return 'alt';
  }
  if (code === 'ControlLeft' || code === 'ControlRight' || input.key === 'Control') {
    return 'control';
  }
  if (
    code === 'MetaLeft' ||
    code === 'MetaRight' ||
    code === 'OSLeft' ||
    code === 'OSRight' ||
    input.key === 'Meta'
  ) {
    return 'meta';
  }
  if (code === 'ShiftLeft' || code === 'ShiftRight' || input.key === 'Shift') {
    return 'shift';
  }
  return undefined;
}

function endsHeldShortcut(binding: ShortcutBinding, input: BeforeInputEvent): boolean {
  if (normalizeCode(input) === binding.code) {
    return true;
  }
  const releasedModifier = modifierForInput(input);
  return releasedModifier !== undefined && binding.modifiers.includes(releasedModifier);
}

function toShortcutInput(input: BeforeInputEvent): ShortcutInput {
  return {
    code: normalizeCode(input),
    alt: input.alt,
    control: input.control,
    meta: input.meta,
    shift: input.shift,
  };
}

export function installShortcutHandler(
  contents: WebContents,
  paletteContents: WebContents,
  registry: CommandRegistry,
  config: AppConfig,
  surface: CommandSurface,
  actions: ShortcutActions,
  holdState: ShortcutHoldState = { activeBinding: undefined },
): () => void {
  const handler = (event: Electron.Event, input: BeforeInputEvent): void => {
    if (input.type === 'keyUp') {
      if (
        holdState.activeBinding !== undefined &&
        endsHeldShortcut(holdState.activeBinding, input)
      ) {
        event.preventDefault();
        holdState.activeBinding = undefined;
        actions.setHoldMode?.(false);
      }
      return;
    }

    if (input.type !== 'keyDown') {
      return;
    }

    if (input.isAutoRepeat === true) {
      if (
        holdState.activeBinding !== undefined &&
        shortcutBindingEquals(
          holdState.activeBinding,
          shortcutBindingFromInput(toShortcutInput(input)),
        )
      ) {
        event.preventDefault();
      }
      return;
    }

    if (input.key === 'Escape') {
      if (surface === 'settings' && actions.isCapturing?.() === true) {
        return;
      }
      event.preventDefault();
      actions.dismissOverlays();
      return;
    }

    if (surface === 'settings' && actions.isCapturing?.() === true) {
      return;
    }

    const commandId = registry.match(
      toShortcutInput(input),
      surface,
      config.mode !== 'production' && config.development.enableDevTools,
    );
    if (commandId === undefined) {
      return;
    }

    event.preventDefault();
    if (registry.getActivation(commandId) === 'hold') {
      const binding = registry.getBinding(commandId);
      const shouldActivate =
        binding !== undefined &&
        (holdState.activeBinding === undefined || actions.isHoldModeActive?.() === false);
      if (binding !== undefined) {
        holdState.activeBinding = binding;
        if (shouldActivate) {
          actions.setHoldMode?.(true);
        }
      }
      return;
    }
    if (commandId === 'palette.open') {
      paletteContents.send(IPC_CHANNELS.commandPaletteOpen);
      return;
    }
    actions.executeCommand(commandId);
  };

  contents.on('before-input-event', handler);
  return () => {
    contents.removeListener('before-input-event', handler);
    if (holdState.activeBinding !== undefined) {
      holdState.activeBinding = undefined;
      actions.setHoldMode?.(false);
    }
  };
}

export function installApplicationShortcuts(
  shellContents: WebContents,
  contentContents: WebContents | null,
  config: AppConfig,
  registry: CommandRegistry,
  actions: ShortcutActions,
): () => void {
  const holdState: ShortcutHoldState = { activeBinding: undefined };
  const removeShellHandler = installShortcutHandler(
    shellContents,
    shellContents,
    registry,
    config,
    'workspace',
    actions,
    holdState,
  );
  const removeContentHandler =
    contentContents === null
      ? () => undefined
      : installShortcutHandler(
          contentContents,
          shellContents,
          registry,
          config,
          'workspace',
          actions,
          holdState,
        );
  return () => {
    removeShellHandler();
    removeContentHandler();
  };
}
