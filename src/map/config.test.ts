import { HILL_LISTS, type HillListBounds } from '../data/lists';
import { RANGE_EDITIONS } from '../domain';
import { LIST_FIT_OPTIONS, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from './config';

// Mirrors MapLibre's mercator maths: at zoom z the world is 512 * 2^z px.
const TILE_SIZE = 512;

// Reference map viewports: a 1280px and a 1920px screen minus the 24rem
// side panel and header, plus a 2560x1080 ultrawide whose extreme aspect
// ratio is what stresses the maxBounds margin for wide bounds like the
// UK-spanning Marilyns. Bounds must fit on all of them.
const VIEWPORTS = [
  { width: 896, height: 608 },
  { width: 1536, height: 824 },
  { width: 2176, height: 864 },
];

interface Viewport {
  width: number;
  height: number;
}

/** Latitude to mercator Y as a fraction of the world (0 = north pole). */
function mercatorY(latitude: number): number {
  const rad = (latitude * Math.PI) / 180;

  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
}

function mercatorSpans(bounds: HillListBounds): { x: number; y: number } {
  const [[west, south], [east, north]] = bounds;

  return { x: (east - west) / 360, y: mercatorY(south) - mercatorY(north) };
}

/** The zoom `fitBounds` needs to fit the bounds with the list padding. */
function fitZoom(bounds: HillListBounds, viewport: Viewport): number {
  const spans = mercatorSpans(bounds);
  const width = viewport.width - 2 * LIST_FIT_OPTIONS.padding;
  const height = viewport.height - 2 * LIST_FIT_OPTIONS.padding;

  return Math.min(
    Math.log2(width / (TILE_SIZE * spans.x)),
    Math.log2(height / (TILE_SIZE * spans.y)),
  );
}

describe('map zoom constraints', () => {
  it('keeps every list initial view inside the zoom limits', () => {
    for (const list of HILL_LISTS) {
      expect(list.initialView.zoom, list.id).toBeGreaterThanOrEqual(MAP_MIN_ZOOM);
      expect(list.initialView.zoom, list.id).toBeLessThanOrEqual(MAP_MAX_ZOOM);
    }
  });

  it('lets every list bounds fit above the minimum zoom', () => {
    for (const list of HILL_LISTS) {
      for (const viewport of VIEWPORTS) {
        expect(
          fitZoom(list.bounds, viewport),
          `${list.id} at ${String(viewport.width)}x${String(viewport.height)}`,
        ).toBeGreaterThanOrEqual(MAP_MIN_ZOOM);
      }
    }
  });

  it('fits every curated edition frame before applying its runtime lock', () => {
    for (const edition of RANGE_EDITIONS) {
      for (const viewport of VIEWPORTS) {
        expect(
          fitZoom(edition.frameBounds, viewport),
          `${edition.id} at ${String(viewport.width)}x${String(viewport.height)}`,
        ).toBeGreaterThanOrEqual(MAP_MIN_ZOOM);
      }
    }
  });
});
