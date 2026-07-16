import { parsePeak } from '../domain';
import {
  DEFAULT_HILL_LIST_ID,
  HILL_LISTS,
  HILL_LIST_IDS,
  getHillList,
  isHillListId,
} from './lists';

describe('hill-list registry', () => {
  it('registers every declared list id exactly once', () => {
    expect(HILL_LISTS.map((list) => list.id)).toEqual([...HILL_LIST_IDS]);
    expect(new Set(HILL_LIST_IDS).size).toBe(HILL_LIST_IDS.length);
  });

  it('defaults to the collated all-peaks list', () => {
    expect(DEFAULT_HILL_LIST_ID).toBe('all');
    expect(isHillListId(DEFAULT_HILL_LIST_ID)).toBe(true);
  });

  it('describes each list with display fields and sane bounds', () => {
    for (const list of HILL_LISTS) {
      expect(list.name.length).toBeGreaterThan(0);
      expect(list.regionLabel.length).toBeGreaterThan(0);
      expect(list.peakNoun.length).toBeGreaterThan(0);

      const [[west, south], [east, north]] = list.bounds;
      expect(west).toBeLessThan(east);
      expect(south).toBeLessThan(north);
      expect(list.initialView.longitude).toBeGreaterThanOrEqual(west);
      expect(list.initialView.longitude).toBeLessThanOrEqual(east);
      expect(list.initialView.latitude).toBeGreaterThanOrEqual(south);
      expect(list.initialView.latitude).toBeLessThanOrEqual(north);
    }
  });

  it('guards list ids', () => {
    expect(isHillListId('wainwrights')).toBe(true);
    expect(isHillListId('munros')).toBe(true);
    expect(isHillListId('nuttalls')).toBe(false);
    expect(isHillListId(undefined)).toBe(false);
    expect(isHillListId(42)).toBe(false);
  });

  it('resolves unknown ids to the default list', () => {
    expect(getHillList('wainwrights').id).toBe('wainwrights');
    expect(getHillList('not-a-list').id).toBe(DEFAULT_HILL_LIST_ID);
  });

  it('lazily loads valid peak data scoped to each list', async () => {
    for (const list of HILL_LISTS) {
      const peaks = await list.loadPeaks();

      expect(peaks.length).toBeGreaterThan(0);
      expect(new Set(peaks.map((peak) => peak.id)).size).toBe(peaks.length);

      const [[west, south], [east, north]] = list.bounds;

      for (const peak of peaks) {
        expect(() => parsePeak(peak)).not.toThrow();

        // The collated list has no membership of its own — every peak in it
        // belongs to at least one source list instead.
        if (list.id !== 'all') {
          expect(peak.list, `${peak.name} list membership`).toContain(list.id);
        }
        expect(peak.lon, `${peak.name} longitude`).toBeGreaterThanOrEqual(west);
        expect(peak.lon, `${peak.name} longitude`).toBeLessThanOrEqual(east);
        expect(peak.lat, `${peak.name} latitude`).toBeGreaterThanOrEqual(south);
        expect(peak.lat, `${peak.name} latitude`).toBeLessThanOrEqual(north);
      }
    }
  });

  it('marks hill lighting on every list the generated profiles cover', () => {
    // The committed UK-wide profile set covers all registered lists — see
    // the committed hill area model suite in src/domain/data-validation.
    const listsWithLighting = HILL_LISTS.filter((list) => list.hasHillLighting).map(
      (list) => list.id,
    );

    expect(listsWithLighting).toEqual([...HILL_LIST_IDS]);
  });

  it('loads the exact published count for every list', async () => {
    const expectedCounts: Record<string, number> = {
      all: 2170,
      wainwrights: 214,
      munros: 282,
      corbetts: 222,
      grahams: 231,
      donalds: 89,
      ethels: 95,
      hewitts: 336,
      marilyns: 1621,
    };

    for (const [id, count] of Object.entries(expectedCounts)) {
      expect((await getHillList(id).loadPeaks()).length, id).toBe(count);
    }

    expect(Object.keys(expectedCounts).sort()).toEqual([...HILL_LIST_IDS].sort());
  });

  it('collates every source list into the all-peaks view, deduplicated', async () => {
    const allPeaks = await getHillList('all').loadPeaks();
    const sourceIds = new Set<string>();

    for (const list of HILL_LISTS.filter((candidate) => candidate.id !== 'all')) {
      for (const peak of await list.loadPeaks()) {
        sourceIds.add(peak.id);
      }
    }

    // One record per distinct hill: nothing dropped, nothing duplicated.
    expect(allPeaks.length).toBe(sourceIds.size);
    expect(new Set(allPeaks.map((peak) => peak.id)).size).toBe(allPeaks.length);

    // A hill on several lists keeps every membership on its single record.
    const allenCrags = allPeaks.find((peak) => peak.id === 'dobih-2388');
    expect(allenCrags?.list).toEqual(
      expect.arrayContaining(['wainwrights', 'hewitts']),
    );
  });
});
