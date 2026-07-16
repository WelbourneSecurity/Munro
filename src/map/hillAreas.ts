import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export type HillAreaData = FeatureCollection<Polygon | MultiPolygon> & {
  metadata?: Record<string, unknown>;
};

let cache: HillAreaData | null = null;
let pending: Promise<HillAreaData> | null = null;

/**
 * Lazily loads the generated UK-wide hill-lighting profiles (one per
 * distinct hill across every list, ~1.4 MB raw). Lighting is a visual
 * enhancement layered over the summit markers, so the data must never sit
 * in the eager bundle or block the first map render — markers carry the
 * tracker until this resolves.
 */
export function loadHillAreas(): Promise<HillAreaData> {
  if (cache) {
    return Promise.resolve(cache);
  }

  pending ??= import('../data/boundaries/hill-areas.geojson?raw').then((module) => {
    cache = JSON.parse(module.default) as HillAreaData;
    return cache;
  });

  return pending;
}
