import { calculateProgress } from './stats';
import type { Peak, PeakProgress } from './schemas';

function makePeaks(count: number): Peak[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `dobih-${String(index + 1)}`,
    dobihId: index + 1,
    name: `Peak ${String(index + 1)}`,
    list: ['wainwrights'],
    region: 'Lake District - Test Fells',
    nationalPark: 'Lake District',
    heightM: 500 + index,
    lat: 54.5,
    lon: -3.1,
  }));
}

describe('calculateProgress', () => {
  it('handles an empty peak list', () => {
    expect(calculateProgress([], [{ peakId: 'dobih-1', bagged: true }])).toEqual({
      total: 0,
      bagged: 0,
      remaining: 0,
      percentage: 0,
      recent: [],
    });
  });

  it('returns rounded partial progress and recent bagged rows', () => {
    const peaks = makePeaks(3);
    const progress: PeakProgress[] = [
      { peakId: 'dobih-1', bagged: true, baggedDate: '2026-07-01' },
      { peakId: 'dobih-2', bagged: false },
      { peakId: 'dobih-3', bagged: true, baggedDate: '2026-07-05' },
    ];

    expect(calculateProgress(peaks, progress)).toEqual({
      total: 3,
      bagged: 2,
      remaining: 1,
      percentage: 67,
      recent: [
        { peakId: 'dobih-3', bagged: true, baggedDate: '2026-07-05' },
        { peakId: 'dobih-1', bagged: true, baggedDate: '2026-07-01' },
      ],
    });
  });

  it('handles complete progress', () => {
    const peaks = makePeaks(214);
    const progress = peaks.map<PeakProgress>((peak) => ({
      peakId: peak.id,
      bagged: true,
    }));

    expect(calculateProgress(peaks, progress)).toMatchObject({
      total: 214,
      bagged: 214,
      remaining: 0,
      percentage: 100,
    });
  });
});
