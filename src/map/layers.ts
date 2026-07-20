import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  HillshadeLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';

import type { MapPaletteId } from '../theme';

export const HILLSHADE_ANCHOR_ID = 'munro-hillshade-anchor';
export const HILL_LIGHTING_ANCHOR_ID = 'munro-hill-lighting-anchor';
export const CONTOURS_ANCHOR_ID = 'munro-contours-anchor';

interface OverlayPalette {
  shadow: string;
  highlight: string;
  accent: string;
  contour: string;
  contourLabel: string;
  contourHalo: string;
  boundary: string;
  bagged: string;
  open: string;
  halo: string;
}

const OVERLAY_PALETTES: Record<MapPaletteId, OverlayPalette> = {
  midnight: {
    shadow: '#11110f',
    highlight: '#77746b',
    accent: '#34342f',
    contour: '#77746b',
    contourLabel: '#c8c1b3',
    contourHalo: '#1c1c19',
    boundary: '#77746b',
    bagged: '#f2efe7',
    open: '#77746b',
    halo: '#11110f',
  },
  light: {
    shadow: '#77746b',
    highlight: '#f8f6f0',
    accent: '#c8c1b3',
    contour: '#77746b',
    contourLabel: '#34342f',
    contourHalo: '#f2efe7',
    boundary: '#77746b',
    bagged: '#11110f',
    open: '#77746b',
    halo: '#f2efe7',
  },
  nature: {
    shadow: '#07100c',
    highlight: '#84937d',
    accent: '#2b4030',
    contour: '#708471',
    contourLabel: '#9aaa93',
    contourHalo: '#111713',
    boundary: '#8a9b88',
    bagged: '#f1f4ee',
    open: '#96a095',
    halo: '#111713',
  },
};

export function terrainHillshadeLayer(
  paletteId: MapPaletteId,
): HillshadeLayerSpecification {
  const palette = OVERLAY_PALETTES[paletteId];
  return {
    id: 'terrain-hillshade',
    type: 'hillshade',
    source: 'terrain-hillshade-dem',
    paint: {
      'hillshade-method': 'standard',
      'hillshade-illumination-direction': 315,
      'hillshade-shadow-color': palette.shadow,
      'hillshade-highlight-color': palette.highlight,
      'hillshade-accent-color': palette.accent,
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
}

export function terrainContourLayer(paletteId: MapPaletteId): LineLayerSpecification {
  return {
    id: 'terrain-contours',
    type: 'line',
    source: 'terrain-contours',
    'source-layer': 'contours',
    minzoom: 8.8,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': OVERLAY_PALETTES[paletteId].contour,
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
}

export function terrainContourLabelLayer(
  paletteId: MapPaletteId,
): SymbolLayerSpecification {
  const palette = OVERLAY_PALETTES[paletteId];
  return {
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
      'text-color': palette.contourLabel,
      'text-halo-color': palette.contourHalo,
      'text-halo-width': 1,
      'text-opacity': 0.72,
    },
  };
}

export function boundaryFillLayer(paletteId: MapPaletteId): FillLayerSpecification {
  return {
    id: 'lake-district-boundary-fill',
    type: 'fill',
    source: 'lake-district-boundary',
    paint: {
      'fill-color': OVERLAY_PALETTES[paletteId].boundary,
      'fill-opacity': 0.08,
    },
  };
}

export function boundaryLineLayer(paletteId: MapPaletteId): LineLayerSpecification {
  return {
    id: 'lake-district-boundary-line',
    type: 'line',
    source: 'lake-district-boundary',
    paint: {
      'line-color': OVERLAY_PALETTES[paletteId].boundary,
      'line-opacity': 0.62,
      'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 11, 2.2],
    },
  };
}

export function peakHitboxLayer(baggedOnly: boolean): CircleLayerSpecification {
  return {
    id: 'peak-hitbox',
    type: 'circle',
    source: 'list-peaks',
    ...(baggedOnly ? { filter: ['==', ['get', 'bagged'], true] } : {}),
    paint: {
      'circle-color': '#ffffff',
      'circle-opacity': 0,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 12, 11, 18, 14, 24],
    },
  };
}

export function surveyPeakMarkerLayer(
  paletteId: MapPaletteId,
  baggedOnly: boolean,
): SymbolLayerSpecification {
  const palette = OVERLAY_PALETTES[paletteId];
  return {
    id: 'survey-peak-markers',
    type: 'symbol',
    source: 'list-peaks',
    filter: baggedOnly
      ? ['all', ['!=', ['get', 'selected'], true], ['==', ['get', 'bagged'], true]]
      : ['!=', ['get', 'selected'], true],
    layout: {
      'text-field': ['case', ['==', ['get', 'bagged'], true], '◆', '◇'],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 8, 15, 12, 20],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': [
        'case',
        ['==', ['get', 'bagged'], true],
        palette.bagged,
        palette.open,
      ],
      'text-halo-color': palette.halo,
      'text-halo-width': 1.2,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.74, 8, 0.92],
    },
  };
}

export function selectedPeakMarkerLayer(
  paletteId: MapPaletteId,
  hidden = false,
): SymbolLayerSpecification {
  const palette = OVERLAY_PALETTES[paletteId];
  return {
    id: 'selected-peak-marker',
    type: 'symbol',
    source: 'list-peaks',
    filter: hidden ? ['==', 1, 0] : ['==', ['get', 'selected'], true],
    layout: {
      'text-field': '◇',
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 7, 28, 12, 38],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': palette.bagged,
      'text-halo-color': palette.halo,
      'text-halo-width': 2,
    },
  };
}

export function selectedPeakLabelLayer(
  paletteId: MapPaletteId,
  hidden = false,
): SymbolLayerSpecification {
  const palette = OVERLAY_PALETTES[paletteId];
  return {
    id: 'selected-peak-label',
    type: 'symbol',
    source: 'list-peaks',
    filter: hidden ? ['==', 1, 0] : ['==', ['get', 'selected'], true],
    layout: {
      'text-anchor': 'top',
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-offset': [0, 1.45],
      'text-size': 12,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': palette.bagged,
      'text-halo-color': palette.halo,
      'text-halo-width': 1.6,
    },
  };
}
