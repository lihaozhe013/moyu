import type {
  ContentBounds,
  ContentStatus,
  GpuDiagnostics,
  LanguageState,
  PersistedWindowState,
  WindowPresentationState,
} from './types';

export const IPC_CHANNELS = {
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowToggleFullscreen: 'window:toggle-fullscreen',
  windowGetState: 'window:get-state',
  windowDragModeChanged: 'window:drag-mode-changed',
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
  commandsGetSummaries: 'commands:get-summaries',
  commandsExecute: 'commands:execute',
  shellSetOverlayVisible: 'shell:set-overlay-visible',
  settingsGetSnapshot: 'settings:get-snapshot',
  settingsSave: 'settings:save',
  settingsSetCaptureMode: 'settings:set-capture-mode',
  settingsClose: 'settings:close',
  settingsSaveRequested: 'settings:save-requested',
  settingsCloseRequested: 'settings:close-requested',
  settingsDismissRequested: 'settings:dismiss-requested',
  diagnosticsGetGpu: 'diagnostics:get-gpu',
  localeGetState: 'locale:get-state',
  localeChanged: 'locale:changed',
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
    readonly getSummaries: () => Promise<readonly import('./commands').CommandSummary[]>;
    readonly execute: (commandId: import('./types').CommandId) => Promise<void>;
    readonly setOverlayVisible: (visible: boolean) => Promise<void>;
    readonly onPaletteOpen: (listener: () => void) => () => void;
    readonly onPaletteClose: (listener: () => void) => () => void;
  };
  readonly layout: {
    readonly setContentBounds: (bounds: ContentBounds) => Promise<void>;
  };
  readonly locale: {
    readonly getState: () => Promise<LanguageState>;
    readonly onChanged: (listener: (state: LanguageState) => void) => () => void;
  };
  readonly diagnostics: {
    readonly getGpuDiagnostics: () => Promise<GpuDiagnostics>;
  };
}

export interface SettingsAPI {
  readonly settings: {
    readonly getSnapshot: () => Promise<import('./types').SettingsSnapshot>;
    readonly save: (
      draft: import('./types').SettingsDraft,
    ) => Promise<import('./types').SettingsSaveResult>;
    readonly setCaptureMode: (active: boolean) => Promise<void>;
    readonly close: () => Promise<void>;
    readonly onSaveRequest: (listener: () => void) => () => void;
    readonly onCloseRequest: (listener: () => void) => () => void;
    readonly onDismissRequest: (listener: () => void) => () => void;
  };
}
