import { describe, expect, it } from 'vitest';

import { peakMarkerLayer } from './layers';

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
