import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
            ...(date ? { baggedDate: date } : {}),
          }),
        );
      },
      unbag: (peakId) => {
        set((state) => {
          const { [peakId]: removed, ...remaining } = state.progressByPeakId;
          void removed;

          return { progressByPeakId: remaining };
        });
      },
      setBaggedDate: (peakId, date) => {
        set((state) => {
          const current = state.progressByPeakId[peakId];

          if (!current) {
            return state;
          }

          const next = { ...current };

          if (date) {
            next.baggedDate = date;
          } else {
            delete next.baggedDate;
          }

          return withValidatedRecord(state, next);
        });
      },
      setNotes: (peakId, notes) => {
        set((state) => {
          const current = state.progressByPeakId[peakId] ?? { peakId, bagged: false };
          const trimmed = notes?.trim();

          const next = {
            ...current,
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
      storage: createJSONStorage(() => localStorage),
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
      migrate: (persisted) => persisted as PreferencesState,
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...(persisted as Partial<PreferencesState> | undefined),
        };

        if (!isHillListId(merged.activeListId)) {
          merged.activeListId = DEFAULT_HILL_LIST_ID;
        }

        return merged;
      },
    },
  ),
);
