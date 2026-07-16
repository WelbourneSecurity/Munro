import { create } from 'zustand';
import { createJSONStorage, persist, type PersistStorage } from 'zustand/middleware';

import { DEFAULT_HILL_LIST_ID, isHillListId, type HillListId } from '../data/lists';
import {
  backupSchema,
  peakProgressSchema,
  type Backup,
  type PeakProgress,
} from '../domain';

export const PROGRESS_STORAGE_KEY = 'munro.progress.v1';
export const PREFERENCES_STORAGE_KEY = 'munro.prefs.v1';
export const BACKUP_VERSION = 1;

export interface ProgressState {
  progressByPeakId: Record<string, PeakProgress>;
  bag: (peakId: string, date?: string) => void;
  unbag: (peakId: string) => void;
  setBaggedDate: (peakId: string, date?: string) => void;
  setNotes: (peakId: string, notes?: string) => void;
  importProgress: (backup: unknown) => void;
  exportProgress: () => Backup;
  resetAll: () => void;
}

export interface StorageHealthState {
  /**
   * True while progress writes to localStorage are failing (quota, storage
   * restrictions). The in-memory record is then ahead of what is persisted,
   * so the shell shows a persistent "export a backup" warning.
   */
  progressWriteFailed: boolean;
}

// Deliberately not persisted: it describes whether persisting works.
export const useStorageHealthStore = create<StorageHealthState>()(() => ({
  progressWriteFailed: false,
}));

// zustand's persist updates the in-memory state first and then calls
// setItem synchronously with no try/catch, so a quota failure would escape
// into a React event handler while the user believes their progress saved —
// and every later write would fail the same way, silently. Catch the write
// failure and surface it via the storage-health flag instead.
function createGuardedProgressStorage():
  PersistStorage<Pick<ProgressState, 'progressByPeakId'>> | undefined {
  const storage = createJSONStorage<Pick<ProgressState, 'progressByPeakId'>>(
    () => localStorage,
  );

  if (!storage) {
    return undefined;
  }

  return {
    ...storage,
    setItem: (name, value) => {
      try {
        storage.setItem(name, value);
        useStorageHealthStore.setState({ progressWriteFailed: false });
      } catch {
        useStorageHealthStore.setState({ progressWriteFailed: true });
      }
    },
  };
}

// localStorage is writable by anything on the origin (previews, other app
// versions, manual edits), so never trust the persisted shape: validate each
// record and fall back to the empty record when the envelope is mis-shaped.
function sanitizePersistedProgress(persisted: unknown): Record<string, PeakProgress> {
  if (typeof persisted !== 'object' || persisted === null) {
    return {};
  }

  const raw = (persisted as { progressByPeakId?: unknown }).progressByPeakId;

  if (typeof raw !== 'object' || raw === null) {
    return {};
  }

  const next: Record<string, PeakProgress> = {};

  for (const record of Object.values(raw)) {
    const parsed = peakProgressSchema.safeParse(record);

    if (parsed.success) {
      next[parsed.data.peakId] = parsed.data;
    }
  }

  return next;
}

// Write paths validate against the same schema importProgress enforces so a
// bad value (e.g. a five-digit year from a date input) can never poison the
// store — and therefore never poison an exported backup that a later restore
// would reject wholesale. Invalid writes leave the state untouched.
function withValidatedRecord(
  state: Pick<ProgressState, 'progressByPeakId'>,
  record: PeakProgress,
) {
  const parsed = peakProgressSchema.safeParse(record);

  if (!parsed.success) {
    return state;
  }

  return {
    progressByPeakId: {
      ...state.progressByPeakId,
      [parsed.data.peakId]: parsed.data,
    },
  };
}

function sortedProgress(progressByPeakId: Record<string, PeakProgress>) {
  return Object.values(progressByPeakId).sort((a, b) =>
    a.peakId.localeCompare(b.peakId),
  );
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progressByPeakId: {},
      bag: (peakId, date) => {
        set((state) =>
          withValidatedRecord(state, {
            ...state.progressByPeakId[peakId],
            peakId,
            bagged: true,
            // The caller's date is a default for first-time bags (today's
            // date from the map panel or summit detection). A date the user
            // already recorded — including one preserved across an
            // accidental unbag — always wins over that default; edits go
            // through setBaggedDate.
            ...(date && !state.progressByPeakId[peakId]?.baggedDate
              ? { baggedDate: date }
              : {}),
          }),
        );
      },
      unbag: (peakId) => {
        set((state) => {
          const current = state.progressByPeakId[peakId];

          if (!current) {
            return state;
          }

          // Unbagging is a single unconfirmed tap in the map panel, so it
          // must not destroy user-authored data: keep notes AND the bagged
          // date on a bagged:false record, and drop the record only when
          // nothing user-authored remains. Re-bagging restores the original
          // date (see bag()).
          if (current.notes || current.baggedDate) {
            return withValidatedRecord(state, {
              peakId,
              bagged: false,
              ...(current.notes ? { notes: current.notes } : {}),
              ...(current.baggedDate ? { baggedDate: current.baggedDate } : {}),
            });
          }

          const { [peakId]: removed, ...remaining } = state.progressByPeakId;
          void removed;

          return { progressByPeakId: remaining };
        });
      },
      setBaggedDate: (peakId, date) => {
        const current = get().progressByPeakId[peakId];
        // An empty string (a cleared date input) means "no date".
        const nextDate = date === '' ? undefined : date;

        // Value-equal writes bail out before set(): a no-op set() would
        // still rebuild the record map (churning every identity-keyed
        // consumer) and rewrite localStorage through persist.
        if (!current || current.baggedDate === nextDate) {
          return;
        }

        set((state) => {
          const next = { ...current };

          if (nextDate) {
            next.baggedDate = nextDate;
          } else {
            delete next.baggedDate;
          }

          return withValidatedRecord(state, next);
        });
      },
      setNotes: (peakId, notes) => {
        const current = get().progressByPeakId[peakId];
        // Whitespace-only notes mean "no notes".
        const trimmedInput = notes?.trim();
        const trimmed = trimmedInput === '' ? undefined : trimmedInput;

        // Notes are re-committed by blur and background flushes (tab
        // switches, navigations) far more often than they change; an
        // unchanged value must not churn state or storage.
        if (current ? current.notes === trimmed : trimmed === undefined) {
          return;
        }

        set((state) => {
          const next = {
            ...(current ?? { peakId, bagged: false }),
            ...(trimmed ? { notes: trimmed } : {}),
          };

          if (!trimmed) {
            delete next.notes;
          }

          return withValidatedRecord(state, next);
        });
      },
      importProgress: (input) => {
        const backup = backupSchema.parse(input);
        const next = Object.fromEntries(
          backup.progress.map((record) => [record.peakId, record]),
        );

        set({ progressByPeakId: next });
      },
      exportProgress: () => ({
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        progress: sortedProgress(get().progressByPeakId),
      }),
      resetAll: () => {
        set({ progressByPeakId: {} });
      },
    }),
    {
      name: PROGRESS_STORAGE_KEY,
      storage: createGuardedProgressStorage(),
      version: BACKUP_VERSION,
      // A version-mismatched store (e.g. written by a newer deploy, then
      // loaded on a rolled-back build) is never passed through unchecked:
      // keep only the records that validate against the current schema.
      migrate: (persisted) => ({
        progressByPeakId: sanitizePersistedProgress(persisted),
      }),
      // merge runs on every hydration (with the migrate result on version
      // mismatch, with the raw persisted state otherwise), so sanitizing
      // here covers both paths and keeps the store actions intact.
      merge: (persisted, current) => ({
        ...current,
        progressByPeakId: sanitizePersistedProgress(persisted),
      }),
    },
  ),
);

// persist hydrates once per context and rewrites the whole map on every
// set(), so two open contexts (a browser tab and the installed PWA window,
// say) would otherwise clobber each other's records last-write-wins.
// Re-hydrate whenever another context writes the progress key — the
// sanitizing merge above makes replaying the persisted value safe. The
// storage event only fires in *other* contexts, never the writing one.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === PROGRESS_STORAGE_KEY) {
      void useProgressStore.persist.rehydrate();
    }
  });
}

export function getProgressList() {
  return sortedProgress(useProgressStore.getState().progressByPeakId);
}

export function isBagged(peakId: string) {
  return useProgressStore.getState().progressByPeakId[peakId]?.bagged === true;
}

export interface PreferencesState {
  activeListId: HillListId;
  terrainEnabled: boolean;
  summitDetectionEnabled: boolean;
  setActiveListId: (listId: HillListId) => void;
  setTerrainEnabled: (enabled: boolean) => void;
  setSummitDetectionEnabled: (enabled: boolean) => void;
}

// Like the progress records, persisted preferences are never trusted: a
// mis-typed value (a manual edit, another same-origin deploy, a version
// rollback) must fall back to the safe default. Summit detection is
// strictly opt-in, so only a literal `true` — never a truthy string like
// "false" — may start the GPS watch.
function sanitizePersistedPreferences(persisted: unknown): Partial<PreferencesState> {
  if (typeof persisted !== 'object' || persisted === null) {
    return {};
  }

  const raw = persisted as Record<string, unknown>;
  const sanitized: Partial<PreferencesState> = {
    activeListId: isHillListId(raw.activeListId)
      ? raw.activeListId
      : DEFAULT_HILL_LIST_ID,
    summitDetectionEnabled: raw.summitDetectionEnabled === true,
  };

  // Terrain defaults to on, so a missing or mis-typed value falls back to
  // the initial state via the merge spread rather than a literal here.
  if (typeof raw.terrainEnabled === 'boolean') {
    sanitized.terrainEnabled = raw.terrainEnabled;
  }

  return sanitized;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      activeListId: DEFAULT_HILL_LIST_ID,
      terrainEnabled: true,
      // Strictly opt-in: GPS summit detection stays off until the user
      // enables it in Settings. Only this boolean is ever persisted —
      // never any location data.
      summitDetectionEnabled: false,
      setActiveListId: (listId) => {
        set({ activeListId: listId });
      },
      setTerrainEnabled: (enabled) => {
        set({ terrainEnabled: enabled });
      },
      setSummitDetectionEnabled: (enabled) => {
        set({ summitDetectionEnabled: enabled });
      },
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // A version-mismatched store is sanitized rather than passed through
      // as-is; merge re-sanitizes on every hydration, covering both paths.
      migrate: (persisted) => sanitizePersistedPreferences(persisted),
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersistedPreferences(persisted),
      }),
    },
  ),
);
