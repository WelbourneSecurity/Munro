import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  HillshadeLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';

export const terrainHillshadeLayer: HillshadeLayerSpecification = {
  id: 'terrain-hillshade',
  type: 'hillshade',
  source: 'terrain-hillshade-dem',
  paint: {
    'hillshade-method': 'standard',
    'hillshade-illumination-direction': 315,
    'hillshade-shadow-color': '#07100c',
    'hillshade-highlight-color': '#84937d',
    'hillshade-accent-color': '#2b4030',
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
    'line-color': '#708471',
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
    'text-color': '#9aaa93',
    'text-halo-color': '#111713',
    'text-halo-width': 1,
    'text-opacity': 0.72,
  },
};

export const hillAreaFillLayer: FillLayerSpecification = {
  id: 'hill-area-fill',
  type: 'fill',
  source: 'wainwright-areas',
  filter: ['any', ['==', ['get', 'bagged'], true], ['==', ['get', 'selected'], true]],
  paint: {
    'fill-color': ['case', ['==', ['get', 'selected'], true], '#c4e9cd', '#a7d8b6'],
    'fill-opacity': ['case', ['==', ['get', 'selected'], true], 0.24, 0.17],
  },
};

export const hillAreaLineLayer: LineLayerSpecification = {
  id: 'hill-area-line',
  type: 'line',
  source: 'wainwright-areas',
  filter: ['any', ['!=', ['get', 'bagged'], true], ['==', ['get', 'selected'], true]],
  paint: {
    'line-color': ['case', ['==', ['get', 'selected'], true], '#e0f5e5', '#829284'],
    'line-opacity': ['case', ['==', ['get', 'selected'], true], 0.9, 0.16],
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      7,
      ['case', ['==', ['get', 'selected'], true], 1.2, 0.45],
      12,
      ['case', ['==', ['get', 'selected'], true], 2.4, 0.72],
    ],
  },
};

export const boundaryFillLayer: FillLayerSpecification = {
  id: 'lake-district-boundary-fill',
  type: 'fill',
  source: 'lake-district-boundary',
  paint: {
    'fill-color': '#233025',
    'fill-opacity': 0.12,
  },
};

export const boundaryLineLayer: LineLayerSpecification = {
  id: 'lake-district-boundary-line',
  type: 'line',
  source: 'lake-district-boundary',
  paint: {
    'line-color': '#8a9b88',
    'line-opacity': 0.78,
    'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 11, 2.2],
  },
};

export const peakHitboxLayer: CircleLayerSpecification = {
  id: 'peak-hitbox',
  type: 'circle',
  source: 'wainwright-peaks',
  paint: {
    'circle-color': '#ffffff',
    'circle-opacity': 0,
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 12, 11, 18, 14, 24],
  },
};

export const baggedSummitLightLayer: CircleLayerSpecification = {
  id: 'bagged-summit-light',
  type: 'circle',
  source: 'wainwright-peaks',
  filter: ['==', ['get', 'bagged'], true],
  paint: {
    'circle-color': '#a7d8b6',
    'circle-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      7,
      0.16,
      11,
      0.28,
      14,
      0.34,
    ],
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 18, 10, 38, 13, 68],
    'circle-blur': ['interpolate', ['linear'], ['zoom'], 7, 0.68, 13, 0.52],
    'circle-pitch-alignment': 'map',
  },
};

export const peakMarkerLayer: CircleLayerSpecification = {
  id: 'peak-markers',
  type: 'circle',
  source: 'wainwright-peaks',
  paint: {
    'circle-color': ['case', ['==', ['get', 'bagged'], true], '#a7d8b6', '#aab3aa'],
    'circle-opacity': 0,
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3.5, 11, 5.5, 14, 7],
    'circle-stroke-color': '#111713',
    'circle-stroke-opacity': 0,
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 12, 1.6],
  },
};

export const peakLabelLayer: SymbolLayerSpecification = {
  id: 'peak-labels',
  type: 'symbol',
  source: 'wainwright-peaks',
  minzoom: 10.5,
  layout: {
    'text-anchor': 'top',
    'text-field': ['get', 'name'],
    'text-font': ['Noto Sans Regular'],
    'text-offset': [0, 0.85],
    'text-size': ['interpolate', ['linear'], ['zoom'], 10.5, 10, 14, 12],
    'text-max-width': 10,
    'text-allow-overlap': false,
    'text-optional': true,
  },
  paint: {
    'text-color': '#d0d8cc',
    'text-halo-color': '#111713',
    'text-halo-width': 1.4,
    'text-opacity': ['interpolate', ['linear'], ['zoom'], 10.5, 0, 11.25, 0.9],
  },
};
