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

  it('defaults to Wainwrights', () => {
    expect(DEFAULT_HILL_LIST_ID).toBe('wainwrights');
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
    expect(isHillListId('munros')).toBe(false);
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
        expect(peak.list, `${peak.name} list membership`).toContain(list.id);
        expect(peak.lon, `${peak.name} longitude`).toBeGreaterThanOrEqual(west);
        expect(peak.lon, `${peak.name} longitude`).toBeLessThanOrEqual(east);
        expect(peak.lat, `${peak.name} latitude`).toBeGreaterThanOrEqual(south);
        expect(peak.lat, `${peak.name} latitude`).toBeLessThanOrEqual(north);
      }
    }
  });

  it('marks hill lighting only where generated profiles exist', () => {
    const listsWithLighting = HILL_LISTS.filter((list) => list.hasHillLighting).map(
      (list) => list.id,
    );

    expect(listsWithLighting).toEqual(['wainwrights']);
  });

  it('loads exactly the 214 Wainwrights for the wainwrights list', async () => {
    const peaks = await getHillList('wainwrights').loadPeaks();

    expect(peaks).toHaveLength(214);
  });
});
