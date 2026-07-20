export const OPENFREEMAP_VECTOR_SOURCE_URL = 'https://tiles.openfreemap.org/planet';
export const OPENFREEMAP_DARK_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
export const AWS_TERRARIUM_TILE_URL =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

// Fallback if the public OpenFreeMap instance becomes unsuitable.
export const TILE_SOURCE_FALLBACK = 'Self-hosted PMTiles/OpenMapTiles extract';
export const TERRAIN_SOURCE_FALLBACK = 'Self-hosted DEM/contour tiles';

// The bounds live with the hill-list registry (the Wainwrights entry uses
// them for its map fit); the export pipeline frames each list's own bounds.
export { LAKE_DISTRICT_BOUNDS } from '../data/lists';

// Per-list bounds and initial cameras live in the hill-list registry
// (`src/data/lists.ts`); these options control how the map fits them.
export const LIST_FIT_OPTIONS = { padding: 56, maxZoom: 9.4 } as const;

// Zoom limits shared by every hill list. MAP_MIN_ZOOM must sit below the
// zoom needed to fit the largest list's bounds (the UK-wide Marilyns fit at
// roughly zoom 4.2-4.7 on laptop viewports) and below every list's
// `initialView.zoom` — `src/map/config.test.ts` cross-checks the registry.
export const MAP_MIN_ZOOM = 3.8;
export const MAP_MAX_ZOOM = 16;
