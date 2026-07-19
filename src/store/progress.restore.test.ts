import { useProgressStore } from './progress';

describe('record-level progress restoration', () => {
  beforeEach(() => useProgressStore.setState({ progressByPeakId: {} }));

  it('restores an exact previous record and can restore absence', () => {
    const previous = {
      peakId: 'dobih-1',
      bagged: true,
      baggedDate: '2025-05-04',
      notes: 'Windy summit',
    } as const;
    useProgressStore.getState().restorePeakProgress('dobih-1', previous);
    expect(useProgressStore.getState().progressByPeakId['dobih-1']).toEqual(previous);
    useProgressStore.getState().restorePeakProgress('dobih-1', undefined);
    expect(useProgressStore.getState().progressByPeakId['dobih-1']).toBeUndefined();
  });
});
