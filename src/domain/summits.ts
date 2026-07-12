import type { Peak } from './schemas';

/** Mean Earth radius in metres (IUGG). */
const EARTH_RADIUS_M = 6_371_008.8;

/** Base detection radius around a summit, in metres. */
export const SUMMIT_DETECTION_RADIUS_M = 100;

/**
 * Fixes with a reported accuracy worse than this are ignored entirely.
 * A kilometre-scale fix says almost nothing about which summit — if any —
 * the device is actually on, so it must never trigger a detection.
 */
export const SUMMIT_DETECTION_MAX_ACCURACY_M = 150;

export interface GeoPosition {
  lat: number;
  lon: number;
  /** Reported GPS accuracy radius in metres. */
  accuracyM: number;
}

export interface SummitDetection {
  peak: Peak;
  distanceM: number;
}

export interface SummitDetectionOptions {
  /** Peak ids to skip — typically peaks that are already bagged. */
  excludePeakIds?: ReadonlySet<string>;
}

/** Great-circle distance between two coordinates, in metres. */
export function haversineDistanceM(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const latA = toRadians(a.lat);
  const latB = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(h, 1)));
}

/**
 * Effective detection radius for a fix: the base radius widened by the
 * reported accuracy, so a slightly fuzzy fix on a summit still counts.
 */
export function summitDetectionRadiusM(accuracyM: number): number {
  const clamped = Math.min(Math.max(accuracyM, 0), SUMMIT_DETECTION_MAX_ACCURACY_M);
  return SUMMIT_DETECTION_RADIUS_M + clamped;
}

/**
 * Returns the peaks whose summit the given position is within detection
 * range of, nearest first. Fixes with unusable accuracy return nothing.
 * List-agnostic: callers pass whichever peaks array is active.
 */
export function detectSummitedPeaks(
  position: GeoPosition,
  peaks: Peak[],
  options: SummitDetectionOptions = {},
): SummitDetection[] {
  if (
    !Number.isFinite(position.accuracyM) ||
    position.accuracyM < 0 ||
    position.accuracyM > SUMMIT_DETECTION_MAX_ACCURACY_M
  ) {
    return [];
  }

  const radiusM = summitDetectionRadiusM(position.accuracyM);

  return peaks
    .filter((peak) => !options.excludePeakIds?.has(peak.id))
    .map((peak) => ({ peak, distanceM: haversineDistanceM(position, peak) }))
    .filter((detection) => detection.distanceM <= radiusM)
    .sort(
      (a, b) =>
        a.distanceM - b.distanceM || a.peak.name.localeCompare(b.peak.name, 'en-GB'),
    );
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
