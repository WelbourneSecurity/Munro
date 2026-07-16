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
  it('hands markers over to the hill lighting only at legible zooms', () => {
    // A ~2 km profile is under 6 px below z8, so the whole-list views (UK
    // at z5) must keep markers; they fade out by z9.2 where profiles are
    // readable.
    const layer = peakMarkerLayer(false);
    const opacity = layer.paint?.['circle-opacity'] as unknown[];
    const strokeOpacity = layer.paint?.['circle-stroke-opacity'] as unknown[];

    expect(opacity[0]).toBe('interpolate');
    expect(opacity.slice(-2)).toEqual([9.2, 0]);
    expect(opacity).toContain(0.72);
    expect(strokeOpacity.slice(-2)).toEqual([9.2, 0]);
  });

  it('keeps markers fully visible while the lighting profiles load', () => {
    const layer = peakMarkerLayer(true);
    const opacity = layer.paint?.['circle-opacity'] as unknown[];

    expect(opacity[0]).toBe('interpolate');
    expect(opacity).not.toContain(0);
    expect(layer.paint?.['circle-stroke-opacity']).toBe(0.85);
  });

  it('keeps a stable layer id for interaction wiring', () => {
    expect(peakMarkerLayer(true).id).toBe('peak-markers');
    expect(peakMarkerLayer(false).id).toBe('peak-markers');
  });
});

describe('baggedSummitLightLayer', () => {
  it('fades the summit light out where the lit hill areas take over', () => {
    const opacity = baggedSummitLightLayer(false).paint?.[
      'circle-opacity'
    ] as unknown[];

    expect(opacity[0]).toBe('interpolate');
    expect(opacity.slice(-2)).toEqual([9.2, 0]);
  });

  it('keeps the summit light at every zoom while profiles load', () => {
    const opacity = baggedSummitLightLayer(true).paint?.['circle-opacity'] as unknown[];

    expect(opacity[0]).toBe('interpolate');
    expect(opacity).not.toContain(0);
  });

  it('keeps a stable layer id so list switches never remount it', () => {
    expect(baggedSummitLightLayer(true).id).toBe('bagged-summit-light');
    expect(baggedSummitLightLayer(false).id).toBe('bagged-summit-light');
  });
});

describe('hill-area layers', () => {
  it('parameterizes the selection into the layer expressions', () => {
    const fill = hillAreaFillLayer('dobih-2460');
    const line = hillAreaLineLayer('dobih-2460');

    expect(JSON.stringify(fill.paint)).toContain('dobih-2460');
    expect(JSON.stringify(line.filter)).toContain('dobih-2460');
    expect(JSON.stringify(line.paint)).toContain('dobih-2460');
  });

  it('lights the fill for bagged hills only, regardless of selection', () => {
    // Selection must never put the bagged glow on an unbagged hill: after
    // "Mark unbagged" the peak stays selected, and the light has to go out
    // immediately rather than linger until the selection moves or the page
    // reloads. Selection brightens the paint, but only bagged features pass
    // the filter at all.
    const baggedOnly = ['==', ['get', 'bagged'], true];

    expect(hillAreaFillLayer('dobih-2460').filter).toEqual(baggedOnly);
    expect(hillAreaFillLayer(undefined).filter).toEqual(baggedOnly);
  });

  it('outlines the selected hill even when nothing is bagged', () => {
    const line = hillAreaLineLayer('dobih-2460');

    expect(line.filter).toEqual([
      'any',
      ['!=', ['get', 'bagged'], true],
      ['==', ['get', 'id'], 'dobih-2460'],
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
