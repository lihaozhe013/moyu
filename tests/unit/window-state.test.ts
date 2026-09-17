import { describe, expect, it } from 'vitest';
import {
  initialWindowPresentationState,
  restoreWindowState,
  transitionWindowPresentation,
} from '../../src/main/window/window-state';

const primaryDisplay = { x: 0, y: 0, width: 1920, height: 1080 } as const;

describe('window state', () => {
  it('keeps maximize and fullscreen as distinct transitions', () => {
    const initial = initialWindowPresentationState();
    const maximized = transitionWindowPresentation(initial, { type: 'maximize' });
    expect(maximized).toEqual({
      presentation: 'maximized',
      presentationBeforeFullscreen: 'maximized',
    });

    const fullscreen = transitionWindowPresentation(maximized, { type: 'enter-fullscreen' });
    expect(fullscreen).toEqual({
      presentation: 'fullscreen',
      presentationBeforeFullscreen: 'maximized',
    });
    expect(transitionWindowPresentation(fullscreen, { type: 'exit-fullscreen' })).toEqual(
      maximized,
    );
    expect(transitionWindowPresentation(fullscreen, { type: 'maximize' })).toEqual(fullscreen);
  });

  it('restores valid state and clamps below-minimum dimensions', () => {
    expect(
      restoreWindowState(
        { width: 900, height: 500, x: 100, y: 120, maximized: false },
        [primaryDisplay],
        primaryDisplay,
      ),
    ).toEqual({
      success: true,
      value: { width: 1100, height: 700, x: 100, y: 120, maximized: false },
    });
  });

  it('centers missing or off-screen state on the primary display', () => {
    const missingCoordinates = restoreWindowState(
      { width: 1600, height: 1000, maximized: true },
      [primaryDisplay],
      primaryDisplay,
    );
    expect(missingCoordinates).toEqual({
      success: true,
      value: { width: 1600, height: 1000, x: 160, y: 40, maximized: true },
    });

    const offScreen = restoreWindowState(
      { width: 1200, height: 800, x: 5000, y: 5000, maximized: true },
      [primaryDisplay],
      primaryDisplay,
    );
    expect(offScreen).toEqual({
      success: true,
      value: { width: 1200, height: 800, x: 360, y: 140, maximized: true },
    });
  });

  it('rejects malformed persisted state and missing displays', () => {
    expect(restoreWindowState({ width: 1 }, [primaryDisplay], primaryDisplay)).toMatchObject({
      success: false,
    });
    expect(
      restoreWindowState({ width: 1600, height: 1000, maximized: false }, [], primaryDisplay),
    ).toMatchObject({ success: false });
  });
});
