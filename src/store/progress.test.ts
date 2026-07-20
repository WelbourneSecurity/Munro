// @vitest-environment jsdom

import { vi } from 'vitest';

import {
  BACKUP_VERSION,
  PREFERENCES_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  getProgressList,
  isBagged,
  usePreferencesStore,
  useProgressStore,
  useStorageHealthStore,
} from './progress';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.getState().resetAll();
  usePreferencesStore.getState().setTerrainEnabled(true);
  usePreferencesStore.getState().setActiveListId('wainwrights');
  usePreferencesStore.getState().setSummitDetectionEnabled(false);
  usePreferencesStore.getState().setVisualPreset('midnight');
});

describe('useProgressStore', () => {
  it('bags and unbags peaks without storing source data', () => {
    useProgressStore.getState().bag('dobih-2319');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
    });

    useProgressStore.getState().unbag('dobih-2319');
    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toBeUndefined();
  });

  it('keeps the bagged date when unbagging so a mis-tap cannot rewrite history', () => {
    useProgressStore.getState().bag('dobih-2319', '2019-06-14');

    useProgressStore.getState().unbag('dobih-2319');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: false,
      baggedDate: '2019-06-14',
    });

    // Re-bagging restores the original date; the caller's date is only a
    // default for first-time bags.
    useProgressStore.getState().bag('dobih-2319', '2026-07-14');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
      baggedDate: '2019-06-14',
    });
  });

  it('keeps notes when unbagging so a mis-tap cannot destroy them', () => {
    useProgressStore.getState().bag('dobih-2319', '2019-06-14');
    useProgressStore.getState().setNotes('dobih-2319', 'Summited in snow with Dad');

    useProgressStore.getState().unbag('dobih-2319');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: false,
      baggedDate: '2019-06-14',
      notes: 'Summited in snow with Dad',
    });

    // Re-bagging keeps the preserved notes and the original date.
    useProgressStore.getState().bag('dobih-2319', '2026-07-12');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
      baggedDate: '2019-06-14',
      notes: 'Summited in snow with Dad',
    });
  });

  it('ignores unbagging a peak with no progress record', () => {
    useProgressStore.getState().unbag('dobih-missing');

    expect(
      useProgressStore.getState().progressByPeakId['dobih-missing'],
    ).toBeUndefined();
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

  it('edits and clears the bagged date while keeping bagged state', () => {
    useProgressStore.getState().bag('dobih-2319', '2026-07-05');
    useProgressStore.getState().setBaggedDate('dobih-2319', '2026-07-08');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
      baggedDate: '2026-07-08',
    });

    useProgressStore.getState().setBaggedDate('dobih-2319');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
    });

    useProgressStore.getState().setBaggedDate('dobih-2319', '');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
    });
  });

  it('ignores bagged-date edits for peaks with no progress record', () => {
    useProgressStore.getState().setBaggedDate('dobih-missing', '2026-07-08');

    expect(
      useProgressStore.getState().progressByPeakId['dobih-missing'],
    ).toBeUndefined();
  });

  it('rejects schema-invalid bagged dates so exports stay restorable', () => {
    useProgressStore.getState().bag('dobih-2319', '2026-07-05');
    useProgressStore.getState().setBaggedDate('dobih-2319', '20266-07-11');

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
      baggedDate: '2026-07-05',
    });

    useProgressStore.getState().bag('dobih-0010', '20266-07-11');

    expect(useProgressStore.getState().progressByPeakId['dobih-0010']).toBeUndefined();

    const backup = useProgressStore.getState().exportProgress();

    expect(() => {
      useProgressStore.getState().importProgress(backup);
    }).not.toThrow();
    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
      baggedDate: '2026-07-05',
    });
  });

  it('persists bagged dates to localStorage', () => {
    useProgressStore.getState().bag('dobih-2319');
    useProgressStore.getState().setBaggedDate('dobih-2319', '2026-07-08');

    expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toContain('2026-07-08');
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

  it('leaves state untouched when notes and dates are rewritten unchanged', () => {
    useProgressStore.getState().bag('dobih-2319', '2026-07-05');
    useProgressStore.getState().setNotes('dobih-2319', 'Clear day from the ridge');

    const before = useProgressStore.getState().progressByPeakId;

    // Background flushes (tab switch, navigation) re-commit the textarea
    // value verbatim; a value-equal write must not churn the record map —
    // identity-keyed consumers (the map GeoJSON, the list window) rebuild
    // on every new map.
    useProgressStore.getState().setNotes('dobih-2319', 'Clear day from the ridge');
    useProgressStore.getState().setNotes('dobih-2319', '  Clear day from the ridge  ');
    useProgressStore.getState().setBaggedDate('dobih-2319', '2026-07-05');

    expect(useProgressStore.getState().progressByPeakId).toBe(before);
  });

  it('does not create a record when clearing notes for a peak with none', () => {
    const before = useProgressStore.getState().progressByPeakId;

    useProgressStore.getState().setNotes('dobih-missing');
    useProgressStore.getState().setNotes('dobih-missing', '   ');

    expect(useProgressStore.getState().progressByPeakId).toBe(before);
    expect(
      useProgressStore.getState().progressByPeakId['dobih-missing'],
    ).toBeUndefined();
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

  it('recovers from a mis-shaped persisted value without poisoning the store', async () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        state: { progressByPeakId: null, bag: 'not-a-function' },
        version: BACKUP_VERSION,
      }),
    );

    await useProgressStore.persist.rehydrate();

    expect(useProgressStore.getState().progressByPeakId).toEqual({});
    expect(typeof useProgressStore.getState().bag).toBe('function');
    expect(() => getProgressList()).not.toThrow();
  });

  it('drops invalid persisted records but keeps valid ones on rehydrate', async () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        state: {
          progressByPeakId: {
            'dobih-2319': { peakId: 'dobih-2319', bagged: true },
            'dobih-bad': { peakId: '', bagged: 'yes' },
            'dobih-null': null,
          },
        },
        version: BACKUP_VERSION,
      }),
    );

    await useProgressStore.persist.rehydrate();

    expect(useProgressStore.getState().progressByPeakId).toEqual({
      'dobih-2319': { peakId: 'dobih-2319', bagged: true },
    });
  });

  it('sanitizes persisted state written under a different version', async () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        state: { progressByPeakId: null },
        version: BACKUP_VERSION + 1,
      }),
    );

    await useProgressStore.persist.rehydrate();

    expect(useProgressStore.getState().progressByPeakId).toEqual({});
    expect(() => getProgressList()).not.toThrow();
  });

  it('keeps schema-valid records when migrating a version-mismatched store', async () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        state: {
          progressByPeakId: {
            'dobih-2319': { peakId: 'dobih-2319', bagged: true },
            'dobih-0010': {
              peakId: 'dobih-0010',
              bagged: true,
              baggedDate: '20266-07-11',
            },
          },
        },
        version: BACKUP_VERSION + 1,
      }),
    );

    await useProgressStore.persist.rehydrate();

    expect(useProgressStore.getState().progressByPeakId).toEqual({
      'dobih-2319': { peakId: 'dobih-2319', bagged: true },
    });
    expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).not.toContain('20266-07-11');
  });

  it('re-hydrates when another context writes the progress key', () => {
    useProgressStore.getState().bag('dobih-0010');

    // Simulate another tab / PWA window persisting a fuller record set.
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        state: {
          progressByPeakId: {
            'dobih-0010': { peakId: 'dobih-0010', bagged: true },
            'dobih-2319': { peakId: 'dobih-2319', bagged: true },
          },
        },
        version: BACKUP_VERSION,
      }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: PROGRESS_STORAGE_KEY }));

    expect(useProgressStore.getState().progressByPeakId).toEqual({
      'dobih-0010': { peakId: 'dobih-0010', bagged: true },
      'dobih-2319': { peakId: 'dobih-2319', bagged: true },
    });
  });

  it('ignores storage events for other keys', () => {
    useProgressStore.getState().bag('dobih-0010');

    localStorage.setItem('munro.other', 'value');
    window.dispatchEvent(new StorageEvent('storage', { key: 'munro.other' }));

    expect(useProgressStore.getState().progressByPeakId).toEqual({
      'dobih-0010': { peakId: 'dobih-0010', bagged: true },
    });
  });

  it('flags failed persistence instead of throwing, and clears on recovery', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    try {
      expect(() => {
        useProgressStore.getState().bag('dobih-2319');
      }).not.toThrow();

      // The in-memory record survives so the session keeps working…
      expect(isBagged('dobih-2319')).toBe(true);
      // …and the failure is surfaced for the shell to warn about.
      expect(useStorageHealthStore.getState().progressWriteFailed).toBe(true);
    } finally {
      setItem.mockRestore();
    }

    useProgressStore.getState().bag('dobih-0010');

    expect(useStorageHealthStore.getState().progressWriteFailed).toBe(false);
    expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toContain('dobih-0010');
  });
});

describe('usePreferencesStore', () => {
  it('persists map preferences to localStorage', () => {
    usePreferencesStore.getState().setTerrainEnabled(false);

    expect(usePreferencesStore.getState().terrainEnabled).toBe(false);
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toContain('false');
  });

  it('defaults to Midnight and persists only recognised visual presets', async () => {
    expect(usePreferencesStore.getInitialState().visualPreset).toBe('midnight');

    usePreferencesStore.getState().setVisualPreset('nature');
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toContain(
      '"visualPreset":"nature"',
    );

    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { visualPreset: 'ultraviolet' },
        version: 1,
      }),
    );
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().visualPreset).toBe('midnight');
  });

  it('defaults the active hill list to the collated all-peaks view', () => {
    // The store's own initial state, not the value the beforeEach set.
    expect(usePreferencesStore.getInitialState().activeListId).toBe('all');
  });

  it('persists the active hill list without touching progress records', () => {
    useProgressStore.getState().bag('dobih-2319');
    usePreferencesStore.getState().setActiveListId('wainwrights');

    expect(usePreferencesStore.getState().activeListId).toBe('wainwrights');
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toContain('wainwrights');
    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
    });
  });

  it('falls back to the default list when the persisted id is unknown', async () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { activeListId: 'retired-list', terrainEnabled: false },
        version: 1,
      }),
    );

    await usePreferencesStore.persist.rehydrate();

    expect(usePreferencesStore.getState().activeListId).toBe('all');
    expect(usePreferencesStore.getState().terrainEnabled).toBe(false);
  });

  it('keeps summit detection off by default and persists only the boolean', () => {
    // Strictly opt-in: assert the store's own initial state, not the value
    // the beforeEach set — this fails if the default ever flips to true.
    expect(usePreferencesStore.getInitialState().summitDetectionEnabled).toBe(false);

    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    expect(usePreferencesStore.getState().summitDetectionEnabled).toBe(true);
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toContain(
      '"summitDetectionEnabled":true',
    );
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).not.toMatch(
      /lat|lon|position|location/i,
    );
  });

  it('treats anything but a literal true as summit detection off', async () => {
    // A truthy string like "false" (manual edit, another same-origin
    // deploy) must never start the GPS watch — detection is strictly
    // opt-in, so only a real boolean true survives hydration.
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { summitDetectionEnabled: 'false', terrainEnabled: 'yes' },
        version: 1,
      }),
    );

    await usePreferencesStore.persist.rehydrate();

    expect(usePreferencesStore.getState().summitDetectionEnabled).toBe(false);
    // A mis-typed terrain preference falls back to its default.
    expect(usePreferencesStore.getState().terrainEnabled).toBe(true);
  });

  it('keeps legitimately persisted preference booleans on rehydrate', async () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: {
          activeListId: 'wainwrights',
          summitDetectionEnabled: true,
          terrainEnabled: false,
        },
        version: 1,
      }),
    );

    await usePreferencesStore.persist.rehydrate();

    expect(usePreferencesStore.getState().activeListId).toBe('wainwrights');
    expect(usePreferencesStore.getState().summitDetectionEnabled).toBe(true);
    expect(usePreferencesStore.getState().terrainEnabled).toBe(false);
  });

  it('sanitizes preferences written under a different version', async () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: { summitDetectionEnabled: 1, activeListId: 'retired-list' },
        version: 2,
      }),
    );

    await usePreferencesStore.persist.rehydrate();

    expect(usePreferencesStore.getState().summitDetectionEnabled).toBe(false);
    expect(usePreferencesStore.getState().activeListId).toBe('all');
  });
});
