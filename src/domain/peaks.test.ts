import { filterPeaks, groupPeakItems, mergePeakLists } from './peaks';
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

describe('mergePeakLists', () => {
  const allenCrags: Peak = {
    id: 'dobih-1',
    dobihId: 1,
    name: 'Allen Crags',
    list: ['wainwrights'],
    region: 'Lake District - Southern Fells',
    nationalPark: 'Lake District',
    heightM: 785,
    lat: 54.48,
    lon: -3.18,
  };
  // The same hill as a Hewitt record that omits the optional park field,
  // mirroring how some source lists ship sparser records.
  const allenCragsAsHewitt: Peak = (() => {
    const copy: Peak = { ...allenCrags, list: ['hewitts'] };
    delete copy.nationalPark;
    return copy;
  })();

  it('folds duplicates by id, keeping one record per hill', () => {
    const merged = mergePeakLists([peaks, [allenCragsAsHewitt]]);

    expect(merged).toHaveLength(3);
    expect(merged.filter((peak) => peak.id === 'dobih-1')).toHaveLength(1);
  });

  it('unions list memberships onto the kept record', () => {
    const merged = mergePeakLists([
      [{ ...allenCrags, list: ['wainwrights'] }],
      [{ ...allenCrags, list: ['hewitts', 'wainwrights'] }],
    ]);

    expect(merged[0]?.list).toEqual(['wainwrights', 'hewitts']);
  });

  it('fills optional fields the kept record lacks without overwriting', () => {
    // Kept record lacks the park; the duplicate provides it.
    const filled = mergePeakLists([[allenCragsAsHewitt], [allenCrags]]);
    expect(filled[0]?.nationalPark).toBe('Lake District');

    // Kept record already has the park; the duplicate must not overwrite.
    const kept = mergePeakLists([
      [allenCrags],
      [{ ...allenCragsAsHewitt, nationalPark: 'Somewhere Else' }],
    ]);
    expect(kept[0]?.nationalPark).toBe('Lake District');
  });

  it('does not mutate the source lists', () => {
    const source = [{ ...allenCrags, list: ['wainwrights'] }];
    mergePeakLists([source, [allenCragsAsHewitt]]);

    expect(source[0]?.list).toEqual(['wainwrights']);
  });
});
