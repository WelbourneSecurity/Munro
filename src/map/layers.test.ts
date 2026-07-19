import munroDarkStyle from './style/munro-dark.json';
import {
  CONTOURS_ANCHOR_ID,
  HILL_LIGHTING_ANCHOR_ID,
  HILLSHADE_ANCHOR_ID,
  selectedPeakLabelLayer,
  selectedPeakMarkerLayer,
  surveyPeakMarkerLayer,
} from './layers';

describe('bone-and-ink map layers', () => {
  it('uses survey symbols with non-colour bagged state', () => {
    expect(surveyPeakMarkerLayer.type).toBe('symbol');
    expect(surveyPeakMarkerLayer.layout?.['text-field']).toEqual([
      'case',
      ['==', ['get', 'bagged'], true],
      '◆',
      '◇',
    ]);
  });

  it('gives selection a separate reticle and visible label', () => {
    expect(selectedPeakMarkerLayer.filter).toEqual(['==', ['get', 'selected'], true]);
    expect(selectedPeakLabelLayer.filter).toEqual(['==', ['get', 'selected'], true]);
  });

  it('keeps terrain overlay anchors ordered in the base style', () => {
    const ids = munroDarkStyle.layers.map((layer) => layer.id);
    expect(ids.indexOf(HILLSHADE_ANCHOR_ID)).toBeLessThan(
      ids.indexOf(HILL_LIGHTING_ANCHOR_ID),
    );
    expect(ids.indexOf(HILL_LIGHTING_ANCHOR_ID)).toBeLessThan(
      ids.indexOf(CONTOURS_ANCHOR_ID),
    );
  });
});
