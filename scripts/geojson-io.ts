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

const COORDINATE_PRECISION = 1e5;

function roundCoordinates(value: unknown): unknown {
  if (typeof value === 'number') {
    return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;
  }

  if (Array.isArray(value)) {
    return value.map(roundCoordinates);
  }

  return value;
}

/** Round every geometry coordinate to ~1 m; properties stay untouched. */
export function quantizeFeatureCollection<T extends FeatureCollection>(data: T): T {
  return {
    ...data,
    features: data.features.map((feature) => ({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: roundCoordinates(
          (feature.geometry as Extract<Geometry, { coordinates: unknown }>).coordinates,
        ),
      } as typeof feature.geometry,
    })),
  };
}

/** Compact, quantized serialization for committed GeoJSON files. */
export function serializeGeoJson(data: FeatureCollection): string {
  return `${JSON.stringify(quantizeFeatureCollection(data))}\n`;
}
