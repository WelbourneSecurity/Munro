import type { Peak, PeakProgress } from './schemas';

export type PeakFilter = 'all' | 'bagged' | 'unbagged';
export type PeakSort = 'name' | 'height';

export interface PeakListItem {
  peak: Peak;
  progress?: PeakProgress;
  bagged: boolean;
}

export interface PeakGroup {
  region: string;
  items: PeakListItem[];
}

export interface PeakListOptions {
  filter: PeakFilter;
  query: string;
  sort: PeakSort;
}

export function getProgressMap(progress: PeakProgress[]) {
  return new Map(progress.map((record) => [record.peakId, record]));
}

export function filterPeaks(
  peaks: Peak[],
  progress: PeakProgress[],
  options: PeakListOptions,
) {
  const progressMap = getProgressMap(progress);
  const query = options.query.trim().toLocaleLowerCase('en-GB');

  return peaks
    .map<PeakListItem>((peak) => {
      const peakProgress = progressMap.get(peak.id);
      const bagged = peakProgress?.bagged === true;

      return {
        peak,
        bagged,
        ...(peakProgress ? { progress: peakProgress } : {}),
      };
    })
    .filter((item) => {
      if (options.filter === 'bagged' && !item.bagged) {
        return false;
      }

      if (options.filter === 'unbagged' && item.bagged) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [item.peak.name, item.peak.region, item.peak.gridRef]
        .filter((value): value is string => typeof value === 'string')
        .some((value) => value.toLocaleLowerCase('en-GB').includes(query));
    })
    .sort((a, b) => sortPeakItems(a, b, options.sort));
}

export function groupPeakItems(items: PeakListItem[]): PeakGroup[] {
  const groups = new Map<string, PeakListItem[]>();

  for (const item of items) {
    const current = groups.get(item.peak.region) ?? [];
    current.push(item);
    groups.set(item.peak.region, current);
  }

  return [...groups.entries()]
    .map(([region, groupItems]) => ({
      region,
      items: groupItems,
    }))
    .sort((a, b) => a.region.localeCompare(b.region, 'en-GB'));
}

function sortPeakItems(a: PeakListItem, b: PeakListItem, sort: PeakSort) {
  if (sort === 'height') {
    return (
      b.peak.heightM - a.peak.heightM || a.peak.name.localeCompare(b.peak.name, 'en-GB')
    );
  }

  return a.peak.name.localeCompare(b.peak.name, 'en-GB');
}
