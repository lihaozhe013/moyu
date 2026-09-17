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
  contentGetState: 'content:get-state',
  layoutSetContentBounds: 'layout:set-content-bounds',
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
    readonly getState: () => Promise<ContentStatus>;
  };
  readonly layout: {
    readonly setContentBounds: (bounds: ContentBounds) => Promise<void>;
  };
}
