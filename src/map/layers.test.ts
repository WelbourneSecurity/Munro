import { describe, expect, it } from 'vitest';

import {
  CONTOURS_ANCHOR_ID,
  HILL_LIGHTING_ANCHOR_ID,
  HILLSHADE_ANCHOR_ID,
  baggedSummitLightLayer,
  hillAreaFillLayer,
  hillAreaLineLayer,
  peakMarkerLayer,
} from './layers';
import munroDarkStyle from './style/munro-dark.json';

describe('peakMarkerLayer', () => {
  it('hides markers for lists whose peaks are shown via hill lighting', () => {
    const layer = peakMarkerLayer(false);

    expect(layer.paint?.['circle-opacity']).toBe(0);
    expect(layer.paint?.['circle-stroke-opacity']).toBe(0);
  });

  it('shows markers for lists without hill-lighting profiles', () => {
    const layer = peakMarkerLayer(true);

    expect(layer.paint?.['circle-opacity']).not.toBe(0);
    expect(layer.paint?.['circle-stroke-opacity']).not.toBe(0);
  });

  it('keeps a stable layer id for interaction wiring', () => {
    expect(peakMarkerLayer(true).id).toBe('peak-markers');
    expect(peakMarkerLayer(false).id).toBe('peak-markers');
  });
});

describe('baggedSummitLightLayer', () => {
  it('hides the summit light for lists with hill lighting', () => {
    expect(baggedSummitLightLayer(false).paint?.['circle-opacity']).toBe(0);
  });

  it('shows the summit light for lists without hill-lighting profiles', () => {
    expect(baggedSummitLightLayer(true).paint?.['circle-opacity']).not.toBe(0);
  });

  it('keeps a stable layer id so list switches never remount it', () => {
    expect(baggedSummitLightLayer(true).id).toBe('bagged-summit-light');
    expect(baggedSummitLightLayer(false).id).toBe('bagged-summit-light');
  });
});

describe('hill-area layers', () => {
  it('highlights only the selected hill through the filter and paint', () => {
    const fill = hillAreaFillLayer('dobih-2460');
    const line = hillAreaLineLayer('dobih-2460');

    expect(JSON.stringify(fill.filter)).toContain('dobih-2460');
    expect(JSON.stringify(fill.paint)).toContain('dobih-2460');
    expect(JSON.stringify(line.filter)).toContain('dobih-2460');
    expect(JSON.stringify(line.paint)).toContain('dobih-2460');
  });

  it('matches no hill when nothing is selected', () => {
    const fill = hillAreaFillLayer(undefined);

    // An empty id matches no feature, so only bagged hills pass the filter.
    expect(fill.filter).toEqual([
      'any',
      ['==', ['get', 'bagged'], true],
      ['==', ['get', 'id'], ''],
    ]);
  });

  it('keeps stable layer ids for interaction wiring', () => {
    expect(hillAreaFillLayer(undefined).id).toBe('hill-area-fill');
    expect(hillAreaLineLayer(undefined).id).toBe('hill-area-line');
  });
});

describe('overlay anchor layers', () => {
  const layers = munroDarkStyle.layers as {
    id: string;
    type: string;
    paint?: Record<string, unknown>;
  }[];

  it.each([[HILLSHADE_ANCHOR_ID], [HILL_LIGHTING_ANCHOR_ID], [CONTOURS_ANCHOR_ID]])(
    'commits %s to the style as an invisible no-op layer',
    (anchorId) => {
      const anchor = layers.find((layer) => layer.id === anchorId);

      expect(anchor).toBeDefined();
      expect(anchor?.type).toBe('background');
      expect(anchor?.paint?.['background-opacity']).toBe(0);
    },
  );

  it('orders the anchors hillshade < hill lighting < contours at the top of the style', () => {
    const ids = layers.map((layer) => layer.id);

    expect(ids.slice(-3)).toEqual([
      HILLSHADE_ANCHOR_ID,
      HILL_LIGHTING_ANCHOR_ID,
      CONTOURS_ANCHOR_ID,
    ]);
  });
});
