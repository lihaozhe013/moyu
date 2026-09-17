import { validateContentBounds } from '../../shared/geometry';
import type { SetZoomFactorRequest } from '../../shared/ipc';
import type { PersistedWindowState, ValidationResult } from '../../shared/types';

const MIN_ZOOM_FACTOR = 0.5;
const MAX_ZOOM_FACTOR = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function validateSetContentBoundsPayload(input: unknown) {
  return validateContentBounds(input);
}

export function validateSetZoomFactorPayload(
  input: unknown,
): ValidationResult<SetZoomFactorRequest> {
  if (!isRecord(input) || Object.keys(input).some((key) => key !== 'factor')) {
    return { success: false, error: 'Zoom payload must contain only factor.' };
  }

  const factor = input.factor;
  if (typeof factor !== 'number' || !Number.isFinite(factor)) {
    return { success: false, error: 'Zoom factor must be a finite number.' };
  }
  if (factor < MIN_ZOOM_FACTOR || factor > MAX_ZOOM_FACTOR) {
    return { success: false, error: 'Zoom factor is outside the supported range.' };
  }

  return { success: true, value: { factor } };
}

export function validatePersistedWindowState(
  input: unknown,
): ValidationResult<PersistedWindowState> {
  if (!isRecord(input)) {
    return { success: false, error: 'Persisted window state must be an object.' };
  }

  const allowedKeys = new Set(['width', 'height', 'x', 'y', 'maximized']);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
    return { success: false, error: 'Persisted window state contains an unknown field.' };
  }

  const { width, height, x, y, maximized } = input;
  if (
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    typeof maximized !== 'boolean'
  ) {
    return {
      success: false,
      error: 'Persisted window state has invalid dimensions or maximized state.',
    };
  }
  if (x !== undefined && (typeof x !== 'number' || !Number.isFinite(x))) {
    return { success: false, error: 'Persisted window x coordinate is invalid.' };
  }
  if (y !== undefined && (typeof y !== 'number' || !Number.isFinite(y))) {
    return { success: false, error: 'Persisted window y coordinate is invalid.' };
  }
  if (width < 1 || width > 100_000 || height < 1 || height > 100_000) {
    return {
      success: false,
      error: 'Persisted window dimensions are outside the supported range.',
    };
  }

  return {
    success: true,
    value: {
      width,
      height,
      ...(x === undefined ? {} : { x }),
      ...(y === undefined ? {} : { y }),
      maximized,
    },
  };
}

export const ZOOM_LIMITS = {
  min: MIN_ZOOM_FACTOR,
  max: MAX_ZOOM_FACTOR,
} as const;
