import type {
  DisplayWorkArea,
  PersistedWindowState,
  RestoredWindowState,
  ValidationResult,
  WindowPresentationEvent,
  WindowPresentationState,
} from '../../shared/types';
import { validatePersistedWindowState } from '../security/ipc-validation';

export const WINDOW_DEFAULTS = {
  width: 1600,
  height: 1000,
  minWidth: 1100,
  minHeight: 700,
} as const;

function fitsWithinDisplay(state: RestoredWindowState, display: DisplayWorkArea): boolean {
  const right = state.x + state.width;
  const bottom = state.y + state.height;
  const displayRight = display.x + display.width;
  const displayBottom = display.y + display.height;
  return (
    right > display.x && state.x < displayRight && bottom > display.y && state.y < displayBottom
  );
}

function centerOnDisplay(
  width: number,
  height: number,
  display: DisplayWorkArea,
): RestoredWindowState {
  return {
    width,
    height,
    x: Math.round(display.x + (display.width - width) / 2),
    y: Math.round(display.y + (display.height - height) / 2),
    maximized: false,
  };
}

export function initialWindowPresentationState(): WindowPresentationState {
  return {
    presentation: 'windowed',
    presentationBeforeFullscreen: 'windowed',
  };
}

export function transitionWindowPresentation(
  state: WindowPresentationState,
  event: WindowPresentationEvent,
): WindowPresentationState {
  switch (event.type) {
    case 'maximize':
      return state.presentation === 'fullscreen'
        ? state
        : { presentation: 'maximized', presentationBeforeFullscreen: 'maximized' };
    case 'restore':
      return state.presentation === 'fullscreen'
        ? state
        : { presentation: 'windowed', presentationBeforeFullscreen: 'windowed' };
    case 'enter-fullscreen':
      return state.presentation === 'fullscreen'
        ? state
        : {
            presentation: 'fullscreen',
            presentationBeforeFullscreen:
              state.presentation === 'maximized' ? 'maximized' : 'windowed',
          };
    case 'exit-fullscreen':
      return state.presentation === 'fullscreen'
        ? {
            presentation: state.presentationBeforeFullscreen,
            presentationBeforeFullscreen: state.presentationBeforeFullscreen,
          }
        : state;
  }
}

export function restoreWindowState(
  input: unknown,
  displays: readonly DisplayWorkArea[],
  primaryDisplay: DisplayWorkArea,
): ValidationResult<RestoredWindowState> {
  const parsed = validatePersistedWindowState(input);
  if (!parsed.success) {
    return parsed;
  }

  if (displays.length === 0) {
    return { success: false, error: 'At least one display is required to restore window state.' };
  }

  const persisted = parsed.value;
  const width = Math.max(WINDOW_DEFAULTS.minWidth, Math.round(persisted.width));
  const height = Math.max(WINDOW_DEFAULTS.minHeight, Math.round(persisted.height));
  if (persisted.x === undefined || persisted.y === undefined) {
    const centered = centerOnDisplay(width, height, primaryDisplay);
    return { success: true, value: { ...centered, maximized: persisted.maximized } };
  }

  const candidate: RestoredWindowState = {
    width,
    height,
    x: Math.round(persisted.x),
    y: Math.round(persisted.y),
    maximized: persisted.maximized,
  };

  return displays.some((display) => fitsWithinDisplay(candidate, display))
    ? { success: true, value: candidate }
    : {
        success: true,
        value: {
          ...centerOnDisplay(width, height, primaryDisplay),
          maximized: persisted.maximized,
        },
      };
}

export function persistedWindowStateFromRestored(state: RestoredWindowState): PersistedWindowState {
  return {
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    maximized: state.maximized,
  };
}
