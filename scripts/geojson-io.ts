/**
 * Shared output shaping for the committed GeoJSON data files.
 *
 * The generated boundary and hill-profile collections are bundled into the
 * app, so their on-disk size is user-facing: pretty-printing and full float
 * precision cost real download bytes (~23% of the initial JS gzip was
 * whitespace and sub-centimetre coordinate digits). Coordinates are rounded
 * to 5 decimal places (~1 m — far tighter than the approximate visual
 * profiles warrant) and the JSON is written compact.
 */
import type { FeatureCollection, Geometry } from 'geojson';

function roundCoordinates(value: unknown, precision: number): unknown {
  if (typeof value === 'number') {
    return Math.round(value * precision) / precision;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => roundCoordinates(entry, precision));
  }

  return value;
}

/**
 * Round every geometry coordinate; properties stay untouched. The default
 * 5 decimal places is ~1 m; generated visual-only data (the hill-lighting
 * profiles) uses 4 (~11 m) since each digit costs real bundle bytes across
 * thousands of vertices.
 */
export function quantizeFeatureCollection<T extends FeatureCollection>(
  data: T,
  decimalPlaces = 5,
): T {
  const precision = 10 ** decimalPlaces;

  return {
    ...data,
    features: data.features.map((feature) => ({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: roundCoordinates(
          (feature.geometry as Extract<Geometry, { coordinates: unknown }>).coordinates,
          precision,
        ),
      } as typeof feature.geometry,
    })),
  };
}

/** Compact, quantized serialization for committed GeoJSON files. */
export function serializeGeoJson(data: FeatureCollection, decimalPlaces = 5): string {
  return `${JSON.stringify(quantizeFeatureCollection(data, decimalPlaces))}\n`;
}
