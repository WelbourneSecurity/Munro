import type { Peak } from './schemas';
import { RANGE_EDITIONS, boundsForPeaks, buildRangeEdition } from './editions';

function peak(overrides: Partial<Peak>): Peak {
  return {
    id: 'dobih-1',
    dobihId: 1,
    name: 'Test hill',
    list: ['humps'],
    region: 'Cairngorms',
    heightM: 800,
    lat: 57,
    lon: -3.7,
    ...overrides,
  };
}

describe('range editions', () => {
  it('keeps a deliberate editorial order', () => {
    expect(RANGE_EDITIONS.map((edition) => edition.id)).toEqual([
      'uk',
      'scotland',
      'cairngorms',
      'wainwrights',
      'wales',
      'peak-district',
      'yorkshire-dales',
      'pennines',
      'northern-ireland',
      'south-west',
      'isle-of-man',
    ]);
  });

  it('builds Scotland as a complete geographic region rather than one list', () => {
    const cairngorm = peak({ id: 'dobih-1', list: ['munros'] });
    const lowland = peak({
      id: 'dobih-2',
      dobihId: 2,
      list: ['humps'],
      region: 'Ochil Hills',
      lat: 56.2,
      lon: -3.8,
    });
    const english = peak({
      id: 'dobih-3',
      dobihId: 3,
      region: 'The Peak District',
      lat: 53.3,
      lon: -1.8,
    });

    expect(buildRangeEdition('scotland', [cairngorm, lowland, english]).peaks).toEqual([
      cairngorm,
      lowland,
    ]);
  });

  it('includes both original and Outlying Fells in Wainwrights', () => {
    const original = peak({ id: 'dobih-1', list: ['wainwrights'] });
    const outlier = peak({
      id: 'dobih-2',
      dobihId: 2,
      list: ['wainwright-outlying-fells'],
    });
    const other = peak({ id: 'dobih-3', dobihId: 3, list: ['birketts'] });

    expect(buildRangeEdition('wainwrights', [original, outlier, other]).peaks).toEqual([
      original,
      outlier,
    ]);
  });

  it('pads the exact data extent so the fitted edition is not clipped', () => {
    expect(
      boundsForPeaks([
        peak({ lat: 54, lon: -3 }),
        peak({ id: 'dobih-2', dobihId: 2, lat: 55, lon: -2 }),
      ]),
    ).toEqual([
      [-3.08, 53.92],
      [-1.92, 55.08],
    ]);
  });
});
