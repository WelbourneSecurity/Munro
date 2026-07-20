import {
  CONTOURS_ANCHOR_ID,
  HILL_LIGHTING_ANCHOR_ID,
  HILLSHADE_ANCHOR_ID,
  peakHitboxLayer,
  selectedPeakLabelLayer,
  selectedPeakMarkerLayer,
  surveyPeakMarkerLayer,
} from './layers';
import { MAP_STYLE_PALETTES } from './styles';

describe('palette-aware map layers', () => {
  it('uses survey symbols with non-colour bagged state', () => {
    const layer = surveyPeakMarkerLayer('midnight', false);
    expect(layer.type).toBe('symbol');
    expect(layer.layout?.['text-field']).toEqual([
      'case',
      ['==', ['get', 'bagged'], true],
      '◆',
      '◇',
    ]);
  });

  it('shows open markers in ranges but only bagged markers in the UK and export', () => {
    expect(surveyPeakMarkerLayer('midnight', false).filter).toEqual([
      '!=',
      ['get', 'selected'],
      true,
    ]);
    expect(surveyPeakMarkerLayer('midnight', true).filter).toEqual([
      'all',
      ['!=', ['get', 'selected'], true],
      ['==', ['get', 'bagged'], true],
    ]);
    expect(peakHitboxLayer(true).filter).toEqual(['==', ['get', 'bagged'], true]);
  });

  it('hides the selection reticle and label during export', () => {
    expect(selectedPeakMarkerLayer('light').filter).toEqual([
      '==',
      ['get', 'selected'],
      true,
    ]);
    expect(selectedPeakLabelLayer('nature', true).filter).toEqual(['==', 1, 0]);
  });

  it('keeps terrain anchors ordered in all three map styles', () => {
    for (const style of Object.values(MAP_STYLE_PALETTES)) {
      const ids = style.layers.map((layer) => layer.id);
      expect(ids.indexOf(HILLSHADE_ANCHOR_ID)).toBeLessThan(
        ids.indexOf(HILL_LIGHTING_ANCHOR_ID),
      );
      expect(ids.indexOf(HILL_LIGHTING_ANCHOR_ID)).toBeLessThan(
        ids.indexOf(CONTOURS_ANCHOR_ID),
      );
    }
  });

  it('restores the original green map and produces a pale bone map', () => {
    const background = (palette: 'light' | 'nature') =>
      MAP_STYLE_PALETTES[palette].layers.find((layer) => layer.id === 'background')
        ?.paint;
    expect(background('light')).toEqual({ 'background-color': '#f2efe7' });
    expect(background('nature')).toEqual({ 'background-color': '#171f1a' });
  });
});
