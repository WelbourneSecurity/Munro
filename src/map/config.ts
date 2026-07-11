export const OPENFREEMAP_VECTOR_SOURCE_URL = 'https://tiles.openfreemap.org/planet';
export const OPENFREEMAP_DARK_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
export const AWS_TERRARIUM_TILE_URL =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

// Fallback if the public OpenFreeMap instance becomes unsuitable.
export const TILE_SOURCE_FALLBACK = 'Self-hosted PMTiles/OpenMapTiles extract';
export const TERRAIN_SOURCE_FALLBACK = 'Self-hosted DEM/contour tiles';

// Per-list bounds and initial cameras live in the hill-list registry
// (`src/data/lists.ts`); these options control how the map fits them.
export const LIST_FIT_OPTIONS = { padding: 56, maxZoom: 9.4 } as const;
