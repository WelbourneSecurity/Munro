import { filterPeaks, groupPeakItems } from './peaks';
import type { Peak, PeakProgress } from './schemas';

const peaks: Peak[] = [
  {
    id: 'dobih-1',
    dobihId: 1,
    name: 'Allen Crags',
    list: ['wainwrights'],
    region: 'Lake District - Southern Fells',
    nationalPark: 'Lake District',
    heightM: 785,
    lat: 54.48,
    lon: -3.18,
  },
  {
    id: 'dobih-2',
    dobihId: 2,
    name: 'Skiddaw',
    list: ['wainwrights'],
    region: 'Lake District - Northern Fells',
    nationalPark: 'Lake District',
    heightM: 930.4,
    lat: 54.65,
    lon: -3.14,
    gridRef: 'NY260290',
  },
  {
    id: 'dobih-3',
    dobihId: 3,
    name: 'Castle Crag',
    list: ['wainwrights'],
    region: 'Lake District - Central Fells',
    nationalPark: 'Lake District',
    heightM: 290,
    lat: 54.52,
    lon: -3.15,
  },
];

const progress: PeakProgress[] = [
  { peakId: 'dobih-2', bagged: true },
  { peakId: 'dobih-3', bagged: false },
];

describe('filterPeaks', () => {
  it('filters all, bagged and unbagged peaks', () => {
    expect(
      filterPeaks(peaks, progress, { filter: 'all', query: '', sort: 'name' }),
    ).toHaveLength(3);

    expect(
      filterPeaks(peaks, progress, { filter: 'bagged', query: '', sort: 'name' }).map(
        (item) => item.peak.name,
      ),
    ).toEqual(['Skiddaw']);

    expect(
      filterPeaks(peaks, progress, {
        filter: 'unbagged',
        query: '',
        sort: 'name',
      }).map((item) => item.peak.name),
    ).toEqual(['Allen Crags', 'Castle Crag']);
  });

  it('searches by name, region and grid reference', () => {
    expect(
      filterPeaks(peaks, progress, {
        filter: 'all',
        query: 'castle',
        sort: 'name',
      }).map((item) => item.peak.name),
    ).toEqual(['Castle Crag']);

    expect(
      filterPeaks(peaks, progress, {
        filter: 'all',
        query: 'northern',
        sort: 'name',
      }).map((item) => item.peak.name),
    ).toEqual(['Skiddaw']);

    expect(
      filterPeaks(peaks, progress, { filter: 'all', query: 'ny260', sort: 'name' }).map(
        (item) => item.peak.name,
      ),
    ).toEqual(['Skiddaw']);
  });

  it('sorts by name or descending height', () => {
    expect(
      filterPeaks(peaks, progress, { filter: 'all', query: '', sort: 'name' }).map(
        (item) => item.peak.name,
      ),
    ).toEqual(['Allen Crags', 'Castle Crag', 'Skiddaw']);

    expect(
      filterPeaks(peaks, progress, { filter: 'all', query: '', sort: 'height' }).map(
        (item) => item.peak.name,
      ),
    ).toEqual(['Skiddaw', 'Allen Crags', 'Castle Crag']);
  });
});

describe('groupPeakItems', () => {
  it('groups filtered rows by region', () => {
    const groups = groupPeakItems(
      filterPeaks(peaks, progress, { filter: 'all', query: '', sort: 'name' }),
    );

    expect(groups.map((group) => group.region)).toEqual([
      'Lake District - Central Fells',
      'Lake District - Northern Fells',
      'Lake District - Southern Fells',
    ]);
    expect(groups[0]?.items.map((item) => item.peak.name)).toEqual(['Castle Crag']);
  });
});
