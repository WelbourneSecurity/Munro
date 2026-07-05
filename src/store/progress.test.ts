// @vitest-environment jsdom

import {
  BACKUP_VERSION,
  PREFERENCES_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  getProgressList,
  isBagged,
  usePreferencesStore,
  useProgressStore,
} from './progress';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.getState().resetAll();
  usePreferencesStore.getState().setTerrainEnabled(true);
});

describe('useProgressStore', () => {
  it('bags and unbags peaks without storing source data', () => {
    useProgressStore.getState().bag('dobih-2319', '2026-07-05');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
      baggedDate: '2026-07-05',
    });

    useProgressStore.getState().unbag('dobih-2319');
    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toBeUndefined();
  });

  it('exports a versioned backup envelope', () => {
    useProgressStore.getState().bag('dobih-2319');

    const backup = useProgressStore.getState().exportProgress();

    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.progress).toEqual([{ peakId: 'dobih-2319', bagged: true }]);
    expect(new Date(backup.exportedAt).toString()).not.toBe('Invalid Date');
  });

  it('returns progress sorted by peak id', () => {
    useProgressStore.getState().bag('dobih-2319');
    useProgressStore.getState().bag('dobih-0010');

    expect(getProgressList().map((record) => record.peakId)).toEqual([
      'dobih-0010',
      'dobih-2319',
    ]);
  });

  it('checks whether an individual peak is bagged', () => {
    useProgressStore.getState().bag('dobih-2319');
    useProgressStore.getState().setNotes('dobih-999', 'Later');

    expect(isBagged('dobih-2319')).toBe(true);
    expect(isBagged('dobih-999')).toBe(false);
    expect(isBagged('dobih-missing')).toBe(false);
  });

  it('trims, stores and clears notes separately from bagged state', () => {
    useProgressStore.getState().bag('dobih-2319');
    useProgressStore.getState().setNotes('dobih-2319', '  Clear day from the ridge  ');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
      notes: 'Clear day from the ridge',
    });

    useProgressStore.getState().setNotes('dobih-2319', '  ');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
    });
  });

  it('imports valid backup data atomically', () => {
    useProgressStore.getState().bag('dobih-2319');

    expect(() => {
      useProgressStore.getState().importProgress({
        version: BACKUP_VERSION,
        exportedAt: '2026-07-05T12:00:00.000Z',
        progress: [{ peakId: 'dobih-999', bagged: true }],
      });
    }).not.toThrow();

    expect(useProgressStore.getState().progressByPeakId).toEqual({
      'dobih-999': { peakId: 'dobih-999', bagged: true },
    });
  });

  it('rejects corrupt imports without changing existing progress', () => {
    useProgressStore.getState().bag('dobih-2319');

    expect(() => {
      useProgressStore.getState().importProgress({
        version: BACKUP_VERSION,
        exportedAt: '2026-07-05T12:00:00.000Z',
        progress: [{ peakId: '', bagged: 'yes' }],
      });
    }).toThrow();

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
    });
  });

  it('persists progress to localStorage', () => {
    useProgressStore.getState().bag('dobih-2319');

    const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);

    expect(stored).toContain('dobih-2319');
  });
});

describe('usePreferencesStore', () => {
  it('persists map preferences to localStorage', () => {
    usePreferencesStore.getState().setTerrainEnabled(false);

    expect(usePreferencesStore.getState().terrainEnabled).toBe(false);
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toContain('false');
  });
});
