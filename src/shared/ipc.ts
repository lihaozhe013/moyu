import type {
  ContentBounds,
  ContentStatus,
  PersistedWindowState,
  WindowPresentationState,
} from './types';

export const IPC_CHANNELS = {
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowToggleFullscreen: 'window:toggle-fullscreen',
  windowGetState: 'window:get-state',
  contentReload: 'content:reload',
  contentHardReload: 'content:hard-reload',
  contentSetZoomFactor: 'content:set-zoom-factor',
  contentGetZoomFactor: 'content:get-zoom-factor',
  contentZoomChanged: 'content:zoom-changed',
  contentGetState: 'content:get-state',
  contentStateChanged: 'content:state-changed',
  layoutSetContentBounds: 'layout:set-content-bounds',
  commandPaletteOpen: 'command-palette:open',
  commandPaletteClose: 'command-palette:close',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export interface SetZoomFactorRequest {
  readonly factor: number;
}

export interface DesktopWindowState {
  readonly presentation: WindowPresentationState;
  readonly persisted: PersistedWindowState;
}

export interface DesktopAPI {
  readonly window: {
    readonly minimize: () => Promise<void>;
    readonly toggleMaximize: () => Promise<void>;
    readonly close: () => Promise<void>;
    readonly toggleFullscreen: () => Promise<void>;
    readonly getState: () => Promise<DesktopWindowState>;
  };
  readonly content: {
    readonly reload: () => Promise<void>;
    readonly hardReload: () => Promise<void>;
    readonly setZoomFactor: (factor: number) => Promise<void>;
    readonly getZoomFactor: () => Promise<number>;
    readonly onZoomChange: (listener: (factor: number) => void) => () => void;
    readonly getState: () => Promise<ContentStatus>;
    readonly onStateChange: (listener: (state: ContentStatus) => void) => () => void;
  };
  readonly commands: {
    readonly onPaletteOpen: (listener: () => void) => () => void;
    readonly onPaletteClose: (listener: () => void) => () => void;
  };
  readonly layout: {
    readonly setContentBounds: (bounds: ContentBounds) => Promise<void>;
  };
}
