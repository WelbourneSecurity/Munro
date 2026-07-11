import { useEffect, useState } from 'react';

import { getHillList, type HillListDefinition } from '../data/lists';
import type { Peak } from '../domain';
import { usePreferencesStore } from '../store';

const peakCache = new Map<string, Peak[]>();

export interface ActiveHillList {
  list: HillListDefinition;
  /** Empty until the list's peak data module has loaded. */
  peaks: Peak[];
}

interface LoadedPeaks {
  listId: string;
  peaks: Peak[];
}

/**
 * Resolves the active hill list from preferences and lazily loads its peak
 * data. Loaded lists are cached so switching back is instant.
 */
export function useActiveHillList(): ActiveHillList {
  const activeListId = usePreferencesStore((state) => state.activeListId);
  const list = getHillList(activeListId);
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

    void list.loadPeaks().then((peaks) => {
      peakCache.set(list.id, peaks);

      if (!cancelled) {
        setLoaded({ listId: list.id, peaks });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [list]);

  return { list, peaks: loaded.listId === list.id ? loaded.peaks : [] };
}
