import type { Peak, PeakProgress } from './schemas';
import { getProgressMap } from './peaks';

export interface ProgressStats {
  total: number;
  bagged: number;
  remaining: number;
  percentage: number;
  recent: PeakProgress[];
}

export function calculateProgress(
  peaks: Peak[],
  progress: PeakProgress[],
): ProgressStats {
  const progressMap = getProgressMap(progress);
  const baggedRecords = peaks
    .map((peak) => progressMap.get(peak.id))
    .filter((record): record is PeakProgress => record?.bagged === true);

  const total = peaks.length;
  const bagged = baggedRecords.length;

  return {
    total,
    bagged,
    remaining: total - bagged,
    percentage: total === 0 ? 0 : Math.round((bagged / total) * 100),
    recent: [...baggedRecords].sort(compareRecentProgress),
  };
}

function compareRecentProgress(a: PeakProgress, b: PeakProgress) {
  const bDate = b.baggedDate ?? '';
  const aDate = a.baggedDate ?? '';
  return bDate.localeCompare(aDate) || a.peakId.localeCompare(b.peakId);
}
