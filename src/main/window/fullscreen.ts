import type { BrowserWindow } from 'electron';
import type { WindowPresentationState } from '../../shared/types';
import { initialWindowPresentationState, transitionWindowPresentation } from './window-state';

export interface WindowPresentationController {
  readonly getState: () => WindowPresentationState;
  readonly toggleMaximize: () => void;
  readonly toggleFullscreen: () => void;
  readonly dispose: () => void;
}

export function createWindowPresentationController(
  mainWindow: BrowserWindow,
): WindowPresentationController {
  let state: WindowPresentationState = mainWindow.isMaximized()
    ? { presentation: 'maximized', presentationBeforeFullscreen: 'maximized' }
    : initialWindowPresentationState();

  const handleMaximize = (): void => {
    state = transitionWindowPresentation(state, { type: 'maximize' });
  };
  const handleUnmaximize = (): void => {
    state = transitionWindowPresentation(state, { type: 'restore' });
  };
  const handleEnterFullscreen = (): void => {
    state = transitionWindowPresentation(state, { type: 'enter-fullscreen' });
  };
  const handleLeaveFullscreen = (): void => {
    state = transitionWindowPresentation(state, { type: 'exit-fullscreen' });
  };

  mainWindow.on('maximize', handleMaximize);
  mainWindow.on('unmaximize', handleUnmaximize);
  mainWindow.on('enter-full-screen', handleEnterFullscreen);
  mainWindow.on('leave-full-screen', handleLeaveFullscreen);

  return {
    getState: () => state,
    toggleMaximize: () => {
      if (state.presentation === 'fullscreen') {
        return;
      }
      if (state.presentation === 'maximized') {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    },
    toggleFullscreen: () => {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    },
    dispose: () => {
      mainWindow.removeListener('maximize', handleMaximize);
      mainWindow.removeListener('unmaximize', handleUnmaximize);
      mainWindow.removeListener('enter-full-screen', handleEnterFullscreen);
      mainWindow.removeListener('leave-full-screen', handleLeaveFullscreen);
    },
  };
}
