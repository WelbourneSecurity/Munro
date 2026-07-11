import { useCallback, useEffect, useState } from 'react';

import { getHillList, type HillListDefinition } from '../data/lists';
import type { Peak } from '../domain';
import { usePreferencesStore } from '../store';

const peakCache = new Map<string, Peak[]>();

export interface ActiveHillList {
  list: HillListDefinition;
  /** Empty until the list's peak data module has loaded. */
  peaks: Peak[];
  /** True when the list's peak data failed to load (e.g. a stale chunk). */
  loadFailed: boolean;
  /** Retries a failed peak-data load. */
  retryLoad: () => void;
}

interface LoadedPeaks {
  listId: string;
  peaks: Peak[];
  failed?: boolean;
}

/**
 * Resolves the active hill list from preferences and lazily loads its peak
 * data. Loaded lists are cached so switching back is instant.
 */
export function useActiveHillList(): ActiveHillList {
  const activeListId = usePreferencesStore((state) => state.activeListId);
  const list = getHillList(activeListId);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadedPeaks>(() => ({
    listId: list.id,
    peaks: peakCache.get(list.id) ?? [],
  }));

  if (loaded.listId !== list.id) {
    // The active list changed since the last render; swap in cached peaks
    // (or an empty list while loading) without showing stale data.
    setLoaded({ listId: list.id, peaks: peakCache.get(list.id) ?? [] });
  }

  useEffect(() => {
    if (peakCache.has(list.id)) {
      return;
    }

    let cancelled = false;

    list.loadPeaks().then(
      (peaks) => {
        peakCache.set(list.id, peaks);

        if (!cancelled) {
          setLoaded({ listId: list.id, peaks });
        }
      },
      () => {
        // Dynamic import failed (offline, or a redeploy replaced the chunk).
        // Surface the failure instead of leaving the tracker empty forever.
        if (!cancelled) {
          setLoaded({ listId: list.id, peaks: [], failed: true });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [list, attempt]);

  const retryLoad = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  const current = loaded.listId === list.id;

  return {
    list,
    peaks: current ? loaded.peaks : [],
    loadFailed: current && loaded.failed === true,
    retryLoad,
  };
}
