import type { ContentBounds, NativeContentBounds, ValidationResult } from './types';

const MAX_COORDINATE = 100_000;
const MAX_DIMENSION = 100_000;
const MIN_DEVICE_PIXEL_RATIO = 0.25;
const MAX_DEVICE_PIXEL_RATIO = 8;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function validateContentBounds(input: unknown): ValidationResult<ContentBounds> {
  if (!isRecord(input)) {
    return { success: false, error: 'Content bounds must be an object.' };
  }

  const keys = ['x', 'y', 'width', 'height', 'devicePixelRatio'];
  if (Object.keys(input).some((key) => !keys.includes(key))) {
    return { success: false, error: 'Content bounds contain an unknown field.' };
  }

  const values = keys.map((key) => input[key]);
  if (values.some((value) => !isFiniteNumber(value))) {
    return { success: false, error: 'Content bounds must contain finite numbers.' };
  }

  const [x, y, width, height, devicePixelRatio] = values as [
    number,
    number,
    number,
    number,
    number,
  ];
  if (x < 0 || x > MAX_COORDINATE || y < 0 || y > MAX_COORDINATE) {
    return { success: false, error: 'Content bounds coordinates are outside the supported range.' };
  }
  if (width < 0 || width > MAX_DIMENSION || height < 0 || height > MAX_DIMENSION) {
    return { success: false, error: 'Content bounds dimensions are outside the supported range.' };
  }
  if (devicePixelRatio < MIN_DEVICE_PIXEL_RATIO || devicePixelRatio > MAX_DEVICE_PIXEL_RATIO) {
    return { success: false, error: 'Device pixel ratio is outside the supported range.' };
  }

  return {
    success: true,
    value: { x, y, width, height, devicePixelRatio },
  };
}

export function roundContentBounds(bounds: ContentBounds): NativeContentBounds {
  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(0, Math.round(bounds.width)),
    height: Math.max(0, Math.round(bounds.height)),
  };
}

export function contentBoundsEqual(left: ContentBounds, right: ContentBounds): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height &&
    left.devicePixelRatio === right.devicePixelRatio
  );
}
