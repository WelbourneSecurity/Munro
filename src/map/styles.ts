import type { StyleSpecification } from 'maplibre-gl';

import type { MapPaletteId } from '../theme';
import { OPENFREEMAP_VECTOR_SOURCE_URL } from './config';
import munroDarkStyle from './style/munro-dark.json';

const NATURE_REPLACEMENTS: Readonly<Record<string, string>> = {
  '#11110f': '#171f1a',
  '#151613': '#18201d',
  '#182024': '#182d35',
  '#1c1c19': '#1d2520',
  '#22221f': '#20261f',
  '#242520': '#263529',
  '#26333a': '#23404a',
  '#282925': '#252c27',
  '#292a26': '#28392d',
  '#30312d': '#2f352f',
  '#383934': '#333a33',
  '#46463f': '#3d463d',
  '#4b4c46': '#454d43',
  '#54554e': '#4a544b',
  '#575850': '#545b50',
  '#5d5e57': '#536251',
  '#5e5f57': '#526050',
  '#77776f': '#758070',
  '#8a9697': '#7e9aa0',
  '#96938b': '#8f9b8e',
  '#9e9b92': '#9aa392',
  '#aaa69d': '#a5ad9d',
  'rgba(104,104,96,0.82)': 'rgba(92,103,91,0.82)',
  'rgba(17,17,15,0.82)': 'rgba(17,23,19,0.82)',
};

const LIGHT_REPLACEMENTS: Readonly<Record<string, string>> = {
  '#11110f': '#f2efe7',
  '#151613': '#ece8de',
  '#182024': '#182024',
  '#1c1c19': '#e6e0d4',
  '#22221f': '#d7d0c4',
  '#242520': '#ddd8cc',
  '#26333a': '#34434a',
  '#282925': '#c8c1b3',
  '#292a26': '#d7d4c7',
  '#30312d': '#d3ccbf',
  '#383934': '#b7b0a4',
  '#46463f': '#ada698',
  '#4b4c46': '#9e988d',
  '#54554e': '#918b81',
  '#575850': '#8d887e',
  '#5d5e57': '#817c73',
  '#5e5f57': '#77746b',
  '#77776f': '#67645d',
  '#8a9697': '#34434a',
  '#96938b': '#5a5751',
  '#9e9b92': '#4c4a45',
  '#aaa69d': '#34342f',
  'rgba(104,104,96,0.82)': 'rgba(142,136,126,0.82)',
  'rgba(17,17,15,0.82)': 'rgba(242,239,231,0.82)',
};

function recolorStyle(replacements: Readonly<Record<string, string>>) {
  let serialized = JSON.stringify(munroDarkStyle);

  for (const [source, target] of Object.entries(replacements)) {
    serialized = serialized.replaceAll(source, target);
  }

  return JSON.parse(serialized) as StyleSpecification;
}

const styles: Record<MapPaletteId, StyleSpecification> = {
  midnight: munroDarkStyle as StyleSpecification,
  light: recolorStyle(LIGHT_REPLACEMENTS),
  nature: recolorStyle(NATURE_REPLACEMENTS),
};

export function mapStyleForPalette(palette: MapPaletteId): StyleSpecification {
  const style = styles[palette];

  return {
    ...style,
    sources: {
      ...style.sources,
      openmaptiles: {
        type: 'vector',
        url: OPENFREEMAP_VECTOR_SOURCE_URL,
      },
    },
  };
}

export const MAP_STYLE_PALETTES = styles;
