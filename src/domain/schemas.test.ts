import { backupSchema, peakProgressSchema, peakSchema } from './schemas';

const validPeak = {
  id: 'dobih-2319',
  dobihId: 2319,
  name: 'Skiddaw',
  list: ['wainwrights'],
  region: 'Lake District - Northern Fells',
  nationalPark: 'Lake District',
  heightM: 930.4,
  heightFt: 3052,
  lat: 54.651391,
  lon: -3.147761,
  gridRef: 'NY260290',
  source: 'Database of British and Irish Hills v18.4',
};

describe('peakSchema', () => {
  it('accepts a valid peak', () => {
    expect(peakSchema.safeParse(validPeak).success).toBe(true);
  });

  it('rejects missing stable identifiers', () => {
    const result = peakSchema.safeParse({ ...validPeak, dobihId: undefined });

    expect(result.success).toBe(false);
  });

  it('rejects invalid coordinates', () => {
    const result = peakSchema.safeParse({ ...validPeak, lat: 154.65 });

    expect(result.success).toBe(false);
  });
});

describe('peakProgressSchema', () => {
  it('accepts optional bagged date and notes', () => {
    expect(
      peakProgressSchema.safeParse({
        peakId: 'dobih-2319',
        bagged: true,
        baggedDate: '2026-07-05',
        notes: 'Clear summit, windy on the ridge.',
      }).success,
    ).toBe(true);
  });

  it('rejects malformed bagged dates', () => {
    expect(
      peakProgressSchema.safeParse({
        peakId: 'dobih-2319',
        bagged: true,
        baggedDate: '05/07/2026',
      }).success,
    ).toBe(false);
  });
});

describe('backupSchema', () => {
  it('accepts a backup envelope', () => {
    expect(
      backupSchema.safeParse({
        version: 1,
        exportedAt: '2026-07-05T12:00:00.000Z',
        progress: [{ peakId: 'dobih-2319', bagged: true }],
      }).success,
    ).toBe(true);
  });

  it('rejects corrupt progress records atomically', () => {
    expect(
      backupSchema.safeParse({
        version: 1,
        exportedAt: '2026-07-05T12:00:00.000Z',
        progress: [{ peakId: '', bagged: 'yes' }],
      }).success,
    ).toBe(false);
  });
});
