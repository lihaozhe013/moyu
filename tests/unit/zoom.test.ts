import { describe, expect, it } from 'vitest';
import { nextZoomFactor, normalizeZoomFactor, ZOOM_STEPS } from '../../src/shared/zoom';

describe('content zoom', () => {
  it('normalizes to the nearest approved step', () => {
    expect(normalizeZoomFactor(1.03)).toBe(1);
    expect(normalizeZoomFactor(1.16)).toBe(1.1);
    expect(normalizeZoomFactor(1.22)).toBe(1.25);
  });

  it('moves between steps without leaving the supported range', () => {
    expect(nextZoomFactor(1, 'in')).toBe(1.1);
    expect(nextZoomFactor(1, 'out')).toBe(0.9);
    const firstStep = ZOOM_STEPS.at(0) ?? 0.5;
    const lastStep = ZOOM_STEPS.at(-1) ?? 2;
    expect(nextZoomFactor(firstStep, 'out')).toBe(firstStep);
    expect(nextZoomFactor(lastStep, 'in')).toBe(lastStep);
  });
});
