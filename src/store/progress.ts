import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { backupSchema, type Backup, type PeakProgress } from '../domain';

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
        set((state) => ({
          progressByPeakId: {
            ...state.progressByPeakId,
            [peakId]: {
              ...state.progressByPeakId[peakId],
              peakId,
              bagged: true,
              ...(date ? { baggedDate: date } : {}),
            },
          },
        }));
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

          return {
            progressByPeakId: {
              ...state.progressByPeakId,
              [peakId]: next,
            },
          };
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

          return {
            progressByPeakId: {
              ...state.progressByPeakId,
              [peakId]: next,
            },
          };
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
      migrate: (persisted) => persisted as ProgressState,
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
  terrainEnabled: boolean;
  setTerrainEnabled: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      terrainEnabled: true,
      setTerrainEnabled: (enabled) => {
        set({ terrainEnabled: enabled });
      },
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persisted) => persisted as PreferencesState,
    },
  ),
);
