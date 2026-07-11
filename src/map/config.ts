export const OPENFREEMAP_VECTOR_SOURCE_URL = 'https://tiles.openfreemap.org/planet';
export const OPENFREEMAP_DARK_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
export const AWS_TERRARIUM_TILE_URL =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

// Fallback if the public OpenFreeMap instance becomes unsuitable.
export const TILE_SOURCE_FALLBACK = 'Self-hosted PMTiles/OpenMapTiles extract';
export const TERRAIN_SOURCE_FALLBACK = 'Self-hosted DEM/contour tiles';

// Must contain the whole committed park boundary polygon
// (src/data/boundaries/lake-district.geojson, bbox lon -3.4956..-2.5826,
// lat 54.1915..54.7637): the live map clamps its viewport to these bounds
// and the export frames them, so a tighter box would cut the outline off.
export const LAKE_DISTRICT_BOUNDS: [[number, number], [number, number]] = [
  [-3.58, 54.18],
  [-2.55, 54.82],
];

export const LAKE_DISTRICT_INITIAL_VIEW = {
  longitude: -3.1,
  latitude: 54.53,
  zoom: 8.55,
  bearing: -12,
  pitch: 38,
} as const;
