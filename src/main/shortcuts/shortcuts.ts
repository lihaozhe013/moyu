import type { WebContents } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';
import type { AppConfig } from '../../shared/types';

export interface ShortcutActions {
  readonly reloadContent: () => void;
  readonly hardReloadContent: () => void;
  readonly toggleFullscreen: () => void;
  readonly resetZoom: () => void;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly openDevTools: () => void;
  readonly closePalette: () => void;
}

interface BeforeInputEvent {
  readonly type: string;
  readonly key: string;
  readonly control: boolean;
  readonly meta: boolean;
  readonly shift: boolean;
}

function hasModifier(input: BeforeInputEvent): boolean {
  return input.control || input.meta;
}

function installOnContents(
  contents: WebContents,
  paletteContents: WebContents,
  config: AppConfig,
  actions: ShortcutActions,
): () => void {
  const handler = (event: Electron.Event, input: BeforeInputEvent): void => {
    if (input.type !== 'keyDown') {
      return;
    }

    const key = input.key.toLowerCase();
    const modifier = hasModifier(input);
    if (modifier && input.shift && key === 'l') {
      event.preventDefault();
      paletteContents.send(IPC_CHANNELS.commandPaletteOpen);
      return;
    }
    if (modifier && input.shift && key === 'r') {
      event.preventDefault();
      actions.hardReloadContent();
      return;
    }
    if (modifier && !input.shift && key === 'r') {
      event.preventDefault();
      actions.reloadContent();
      return;
    }
    if (!modifier && input.key === 'F11') {
      event.preventDefault();
      actions.toggleFullscreen();
      return;
    }
    if (modifier && !input.shift && key === '0') {
      event.preventDefault();
      actions.resetZoom();
      return;
    }
    if (modifier && (input.key === '+' || (input.key === '=' && input.shift))) {
      event.preventDefault();
      actions.zoomIn();
      return;
    }
    if (modifier && !input.shift && key === '-') {
      event.preventDefault();
      actions.zoomOut();
      return;
    }
    if (modifier && input.shift && key === 'i') {
      if (config.mode === 'development' && config.development.enableDevTools) {
        event.preventDefault();
        actions.openDevTools();
      }
      return;
    }
    if (input.key === 'Escape') {
      paletteContents.send(IPC_CHANNELS.commandPaletteClose);
      actions.closePalette();
    }
  };

  contents.on('before-input-event', handler);
  return () => contents.removeListener('before-input-event', handler);
}

export function installApplicationShortcuts(
  shellContents: WebContents,
  contentContents: WebContents,
  config: AppConfig,
  actions: ShortcutActions,
): () => void {
  const removeShellHandler = installOnContents(shellContents, shellContents, config, actions);
  const removeContentHandler = installOnContents(contentContents, shellContents, config, actions);
  return () => {
    removeShellHandler();
    removeContentHandler();
  };
}
