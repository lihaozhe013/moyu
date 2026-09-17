import { describe, expect, it } from 'vitest';
import {
  contentBoundsEqual,
  roundContentBounds,
  validateContentBounds,
} from '../../src/shared/geometry';

describe('content geometry', () => {
  it('validates and rounds fractional bounds', () => {
    const result = validateContentBounds({
      x: 48.4,
      y: 68.6,
      width: 1279.5,
      height: 800.4,
      devicePixelRatio: 1.25,
    });

    expect(result).toEqual({
      success: true,
      value: {
        x: 48.4,
        y: 68.6,
        width: 1279.5,
        height: 800.4,
        devicePixelRatio: 1.25,
      },
    });
    if (result.success) {
      expect(roundContentBounds(result.value)).toEqual({
        x: 48,
        y: 69,
        width: 1280,
        height: 800,
      });
    }
  });

  it('accepts a zero-size transitional rectangle', () => {
    expect(
      validateContentBounds({ x: 0, y: 0, width: 0, height: 0, devicePixelRatio: 2 }),
    ).toMatchObject({ success: true });
  });

  it('rejects malformed, unknown, and out-of-range values', () => {
    expect(validateContentBounds(null)).toMatchObject({ success: false });
    expect(
      validateContentBounds({ x: 0, y: 0, width: 1, height: 1, devicePixelRatio: 1, extra: 1 }),
    ).toMatchObject({ success: false });
    expect(
      validateContentBounds({ x: -1, y: 0, width: 1, height: 1, devicePixelRatio: 1 }),
    ).toMatchObject({ success: false });
    expect(
      validateContentBounds({ x: 0, y: 0, width: Number.NaN, height: 1, devicePixelRatio: 1 }),
    ).toMatchObject({ success: false });
    expect(
      validateContentBounds({ x: 0, y: 0, width: 1, height: 1, devicePixelRatio: 10 }),
    ).toMatchObject({ success: false });
  });

  it('compares all geometry inputs', () => {
    const bounds = { x: 1, y: 2, width: 3, height: 4, devicePixelRatio: 1 } as const;
    expect(contentBoundsEqual(bounds, { ...bounds })).toBe(true);
    expect(contentBoundsEqual(bounds, { ...bounds, devicePixelRatio: 2 })).toBe(false);
  });
});
