import type { WebContents } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';
import type { AppConfig, CommandId } from '../../shared/types';
import type { ShortcutInput } from '../../shared/commands';
import type { CommandRegistry, CommandSurface } from '../commands/command-registry';

export interface ShortcutActions {
  readonly executeCommand: (commandId: CommandId) => void;
  readonly dismissOverlays: () => void;
  readonly isCapturing?: () => boolean;
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
): () => void {
  const handler = (event: Electron.Event, input: BeforeInputEvent): void => {
    if (input.type !== 'keyDown' || input.isAutoRepeat === true) {
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
      config.mode === 'development' && config.development.enableDevTools,
    );
    if (commandId === undefined) {
      return;
    }

    event.preventDefault();
    if (commandId === 'palette.open') {
      paletteContents.send(IPC_CHANNELS.commandPaletteOpen);
      return;
    }
    actions.executeCommand(commandId);
  };

  contents.on('before-input-event', handler);
  return () => contents.removeListener('before-input-event', handler);
}

export function installApplicationShortcuts(
  shellContents: WebContents,
  contentContents: WebContents | null,
  config: AppConfig,
  registry: CommandRegistry,
  actions: ShortcutActions,
): () => void {
  const removeShellHandler = installShortcutHandler(
    shellContents,
    shellContents,
    registry,
    config,
    'workspace',
    actions,
  );
  const removeContentHandler =
    contentContents === null
      ? () => undefined
      : installShortcutHandler(contentContents, shellContents, registry, config, 'workspace', actions);
  return () => {
    removeShellHandler();
    removeContentHandler();
  };
}
