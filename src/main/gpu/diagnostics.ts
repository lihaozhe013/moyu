import { app, screen } from 'electron';
import type { GpuDiagnostics } from '../../shared/types';

function versionOrUnknown(value: string | undefined): string {
  return value === undefined || value.length === 0 ? 'unknown' : value;
}

export function collectGpuDiagnostics(): GpuDiagnostics {
  const featureStatus = app.getGPUFeatureStatus();
  const scaleFactors = screen
    .getAllDisplays()
    .map((display) => display.scaleFactor)
    .filter((factor) => Number.isFinite(factor));

  return {
    appVersion: app.getVersion(),
    electronVersion: versionOrUnknown(process.versions.electron),
    chromiumVersion: versionOrUnknown(process.versions.chrome),
    nodeVersion: versionOrUnknown(process.versions.node),
    platform: process.platform,
    architecture: process.arch,
    featureStatus: Object.fromEntries(
      Object.entries(featureStatus).map(([key, value]) => [key, String(value)]),
    ),
    scaleFactors,
  };
}
