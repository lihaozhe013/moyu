export const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const;

export type ZoomDirection = 'in' | 'out';

export function normalizeZoomFactor(factor: number): number {
  let closest: number = ZOOM_STEPS[0];
  let distance = Math.abs(factor - closest);
  for (const candidate of ZOOM_STEPS.slice(1)) {
    const candidateDistance = Math.abs(factor - candidate);
    if (candidateDistance < distance) {
      closest = candidate;
      distance = candidateDistance;
    }
  }
  return closest;
}

export function nextZoomFactor(current: number, direction: ZoomDirection): number {
  const normalized = normalizeZoomFactor(current);
  const index = ZOOM_STEPS.findIndex((candidate) => candidate === normalized);
  const safeIndex = index < 0 ? ZOOM_STEPS.indexOf(1) : index;
  const nextIndex =
    direction === 'in'
      ? Math.min(ZOOM_STEPS.length - 1, safeIndex + 1)
      : Math.max(0, safeIndex - 1);
  return ZOOM_STEPS[nextIndex] ?? normalized;
}
