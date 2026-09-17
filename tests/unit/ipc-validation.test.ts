import { describe, expect, it } from 'vitest';
import {
  validatePersistedWindowState,
  validateSetContentBoundsPayload,
  validateSetZoomFactorPayload,
  ZOOM_LIMITS,
} from '../../src/main/security/ipc-validation';

describe('IPC payload validation', () => {
  it('accepts valid bounds and zoom payloads', () => {
    expect(
      validateSetContentBoundsPayload({
        x: 0,
        y: 32,
        width: 100,
        height: 200,
        devicePixelRatio: 2,
      }),
    ).toMatchObject({ success: true });
    expect(validateSetZoomFactorPayload({ factor: 1 })).toEqual({
      success: true,
      value: { factor: 1 },
    });
    expect(validateSetZoomFactorPayload({ factor: ZOOM_LIMITS.min })).toMatchObject({
      success: true,
    });
    expect(validateSetZoomFactorPayload({ factor: ZOOM_LIMITS.max })).toMatchObject({
      success: true,
    });
  });

  it('rejects invalid zoom values and extra fields', () => {
    expect(validateSetZoomFactorPayload({ factor: 0.49 })).toMatchObject({ success: false });
    expect(validateSetZoomFactorPayload({ factor: 2.01 })).toMatchObject({ success: false });
    expect(validateSetZoomFactorPayload({ factor: Number.POSITIVE_INFINITY })).toMatchObject({
      success: false,
    });
    expect(validateSetZoomFactorPayload({ factor: 1, extra: true })).toMatchObject({
      success: false,
    });
  });

  it('validates persisted window state with optional coordinates', () => {
    expect(
      validatePersistedWindowState({ width: 1600, height: 1000, maximized: false }),
    ).toMatchObject({ success: true });
    expect(
      validatePersistedWindowState({ width: 1600, height: 1000, x: -20, y: 30, maximized: true }),
    ).toMatchObject({ success: true });
    expect(
      validatePersistedWindowState({ width: 0, height: 1000, maximized: false }),
    ).toMatchObject({
      success: false,
    });
    expect(
      validatePersistedWindowState({ width: 1600, height: 1000, maximized: false, unknown: true }),
    ).toMatchObject({ success: false });
  });
});
