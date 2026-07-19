import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  HillshadeLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';

// Invisible no-op anchor layers committed at the top of style/munro-dark.json.
// Conditional overlays (terrain hillshade, hill lighting, contours) pass
// these as beforeId so layers remounted mid-session — toggling Terrain,
// switching hill lists — always return to the same stacking position below
// the always-mounted peak layers, exactly as on a fresh page load.
export const HILLSHADE_ANCHOR_ID = 'munro-hillshade-anchor';
export const HILL_LIGHTING_ANCHOR_ID = 'munro-hill-lighting-anchor';
export const CONTOURS_ANCHOR_ID = 'munro-contours-anchor';

export const terrainHillshadeLayer: HillshadeLayerSpecification = {
  id: 'terrain-hillshade',
  type: 'hillshade',
  source: 'terrain-hillshade-dem',
  paint: {
    'hillshade-method': 'standard',
    'hillshade-illumination-direction': 315,
    'hillshade-shadow-color': '#11110f',
    'hillshade-highlight-color': '#77746b',
    'hillshade-accent-color': '#34342f',
    'hillshade-exaggeration': [
      'interpolate',
      ['linear'],
      ['zoom'],
      7,
      0.14,
      11,
      0.28,
      14,
      0.38,
      16,
      0.42,
    ],
  },
};

export const terrainContourLayer: LineLayerSpecification = {
  id: 'terrain-contours',
  type: 'line',
  source: 'terrain-contours',
  'source-layer': 'contours',
  minzoom: 8.8,
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': '#77746b',
    'line-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      9,
      ['match', ['get', 'level'], 1, 0.26, 0.1],
      13,
      ['match', ['get', 'level'], 1, 0.36, 0.18],
      16,
      ['match', ['get', 'level'], 1, 0.42, 0.22],
    ],
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      9,
      ['match', ['get', 'level'], 1, 0.72, 0.32],
      13,
      ['match', ['get', 'level'], 1, 0.9, 0.44],
      16,
      ['match', ['get', 'level'], 1, 1.05, 0.56],
    ],
  },
};

export const terrainContourLabelLayer: SymbolLayerSpecification = {
  id: 'terrain-contour-labels',
  type: 'symbol',
  source: 'terrain-contours',
  'source-layer': 'contours',
  minzoom: 12.4,
  filter: ['>', ['get', 'level'], 0],
  layout: {
    'symbol-placement': 'line',
    'text-anchor': 'center',
    'text-field': ['concat', ['number-format', ['get', 'ele'], {}], 'm'],
    'text-font': ['Noto Sans Regular'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 10],
  },
  paint: {
    'text-color': '#c8c1b3',
    'text-halo-color': '#1c1c19',
    'text-halo-width': 1,
    'text-opacity': 0.72,
  },
};

export const boundaryFillLayer: FillLayerSpecification = {
  id: 'lake-district-boundary-fill',
  type: 'fill',
  source: 'lake-district-boundary',
  paint: {
    'fill-color': '#34342f',
    'fill-opacity': 0.08,
  },
};

export const boundaryLineLayer: LineLayerSpecification = {
  id: 'lake-district-boundary-line',
  type: 'line',
  source: 'lake-district-boundary',
  paint: {
    'line-color': '#77746b',
    'line-opacity': 0.62,
    'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 11, 2.2],
  },
};

export const peakHitboxLayer: CircleLayerSpecification = {
  id: 'peak-hitbox',
  type: 'circle',
  source: 'list-peaks',
  paint: {
    'circle-color': '#ffffff',
    'circle-opacity': 0,
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 12, 11, 18, 14, 24],
  },
};

/** Survey-style summit marks used by the bone-and-ink Explore map. */
export const surveyPeakMarkerLayer: SymbolLayerSpecification = {
  id: 'survey-peak-markers',
  type: 'symbol',
  source: 'list-peaks',
  filter: ['!=', ['get', 'selected'], true],
  layout: {
    'text-field': ['case', ['==', ['get', 'bagged'], true], '◆', '◇'],
    'text-font': ['Noto Sans Regular'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 8, 15, 12, 20],
    'text-allow-overlap': true,
    'text-ignore-placement': true,
  },
  paint: {
    'text-color': ['case', ['==', ['get', 'bagged'], true], '#f2efe7', '#77746b'],
    'text-halo-color': '#11110f',
    'text-halo-width': 1.2,
    'text-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.74, 8, 0.92],
  },
};

export const selectedPeakMarkerLayer: SymbolLayerSpecification = {
  id: 'selected-peak-marker',
  type: 'symbol',
  source: 'list-peaks',
  filter: ['==', ['get', 'selected'], true],
  layout: {
    'text-field': '◇',
    'text-font': ['Noto Sans Regular'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 7, 28, 12, 38],
    'text-allow-overlap': true,
    'text-ignore-placement': true,
  },
  paint: {
    'text-color': '#f2efe7',
    'text-halo-color': '#11110f',
    'text-halo-width': 2,
  },
};

export const selectedPeakLabelLayer: SymbolLayerSpecification = {
  id: 'selected-peak-label',
  type: 'symbol',
  source: 'list-peaks',
  filter: ['==', ['get', 'selected'], true],
  layout: {
    'text-anchor': 'top',
    'text-field': ['get', 'name'],
    'text-font': ['Noto Sans Regular'],
    'text-offset': [0, 1.45],
    'text-size': 12,
    'text-allow-overlap': true,
  },
  paint: {
    'text-color': '#f2efe7',
    'text-halo-color': '#11110f',
    'text-halo-width': 1.6,
  },
};
