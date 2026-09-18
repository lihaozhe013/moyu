import type { CommandSummary } from './commands';

export type AppMode = 'development' | 'production' | 'test';

export type WindowPresentation = 'windowed' | 'maximized' | 'fullscreen';

export type ShortcutModifier = 'alt' | 'control' | 'meta' | 'shift';

export interface ShortcutBinding {
  readonly code: string;
  readonly modifiers: readonly ShortcutModifier[];
}

export type CommandId =
  | 'settings.open'
  | 'settings.save'
  | 'palette.open'
  | 'window.minimize'
  | 'window.toggleMaximize'
  | 'window.close'
  | 'app.quit'
  | 'window.toggleFullscreen'
  | 'content.reload'
  | 'content.hardReload'
  | 'content.zoomReset'
  | 'content.zoomIn'
  | 'content.zoomOut'
  | 'shell.about'
  | 'shell.gpuDiagnostics'
  | 'devtools.open';

export type ContentStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'ready' }
  | { type: 'error'; code: number; description: string }
  | { type: 'crashed' };

export interface ContentBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
}

export interface NativeContentBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ContentConfig {
  readonly initialUrl?: string;
  readonly allowedOrigins: readonly string[];
  readonly authenticationOrigins: readonly string[];
}

export interface DevelopmentConfig {
  readonly enableDevTools: boolean;
  readonly allowArbitraryNavigation: boolean;
}

export interface SessionConfig {
  readonly persist: boolean;
  readonly partition: string;
}

export interface AppConfig {
  readonly mode: AppMode;
  readonly content: ContentConfig;
  readonly development: DevelopmentConfig;
  readonly session: SessionConfig;
}

export interface PersistedWindowState {
  readonly width: number;
  readonly height: number;
  readonly x?: number;
  readonly y?: number;
  readonly maximized: boolean;
}

export interface AppPreferencesV1 {
  readonly version: 1;
  readonly workspaceUrl?: string;
  readonly shortcuts: Readonly<Partial<Record<CommandId, ShortcutBinding>>>;
  readonly window: PersistedWindowState;
}

export interface SettingsSnapshot {
  readonly workspaceUrl?: string;
  readonly commands: readonly CommandSummary[];
  readonly shortcutOverrides: Readonly<Partial<Record<CommandId, ShortcutBinding>>>;
}

export interface SettingsDraft {
  readonly workspaceUrl: string;
  readonly shortcuts: Readonly<Partial<Record<CommandId, ShortcutBinding>>>;
}

export type SettingsSaveResult =
  | {
      readonly success: true;
      readonly snapshot: SettingsSnapshot;
      readonly workspaceReloadStarted: boolean;
    }
  | {
      readonly success: false;
      readonly fieldErrors: Readonly<Record<string, string>>;
      readonly message: string;
    };

export interface RestoredWindowState {
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
  readonly maximized: boolean;
}

export interface DisplayWorkArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WindowPresentationState {
  readonly presentation: WindowPresentation;
  readonly presentationBeforeFullscreen: Exclude<WindowPresentation, 'fullscreen'>;
}

export type WindowPresentationEvent =
  | { readonly type: 'maximize' }
  | { readonly type: 'restore' }
  | { readonly type: 'enter-fullscreen' }
  | { readonly type: 'exit-fullscreen' };

export interface ZoomState {
  readonly factor: number;
}

export interface GpuDiagnostics {
  readonly appVersion: string;
  readonly electronVersion: string;
  readonly chromiumVersion: string;
  readonly nodeVersion: string;
  readonly platform: string;
  readonly architecture: string;
  readonly featureStatus: Readonly<Record<string, string>>;
  readonly scaleFactors: readonly number[];
}

export type ValidationResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: string };
