import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import type { Peak } from '../domain';
import { usePreferencesStore } from '../store';
import { useActiveHillList } from './useActiveHillList';

const munrosDeferred = vi.hoisted(() => {
  let resolve!: (peaks: Peak[]) => void;
  const promise = new Promise<Peak[]>((res) => {
    resolve = res;
  });

  return { promise, resolve };
});

const corbettsState = vi.hoisted(() => ({ calls: 0 }));
const grahamsState = vi.hoisted(() => ({ calls: 0 }));

vi.mock('../data/lists', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/lists')>();
  const wainwrights = actual.HILL_LISTS.find((list) => list.id === 'wainwrights');

  if (!wainwrights) {
    throw new Error('Expected the registry to contain the Wainwrights');
  }

  const lists = [
    wainwrights,
    {
      ...wainwrights,
      id: 'munros',
      name: 'Munros',
      loadPeaks: () => munrosDeferred.promise,
    },
    {
      ...wainwrights,
      id: 'corbetts',
      name: 'Corbetts',
      loadPeaks: () => {
        corbettsState.calls += 1;

        return corbettsState.calls === 1
          ? Promise.reject(new Error('chunk load failed'))
          : wainwrights.loadPeaks();
      },
    },
    {
      ...wainwrights,
      id: 'grahams',
      name: 'Grahams',
      loadPeaks: () => {
        grahamsState.calls += 1;

        // Fail once per initially-mounted instance, then succeed on retry.
        return grahamsState.calls <= 2
          ? Promise.reject(new Error('chunk load failed'))
          : wainwrights.loadPeaks();
      },
    },
  ];

  return {
    ...actual,
    HILL_LISTS: lists,
    getHillList: (id: string) => lists.find((list) => list.id === id) ?? wainwrights,
  };
});

describe('useActiveHillList', () => {
  beforeEach(() => {
    localStorage.clear();
    usePreferencesStore.getState().setActiveListId('wainwrights');
  });

  it('resolves the active list and lazily loads its peaks', async () => {
    const { result } = renderHook(() => useActiveHillList());

    expect(result.current.list.id).toBe('wainwrights');
    expect(result.current.list.name).toBe('Wainwrights');

    await waitFor(() => {
      expect(result.current.peaks).toHaveLength(214);
    });

    expect(result.current.peaks[0]?.list).toContain('wainwrights');
  });

  it('serves cached peaks synchronously on remount', async () => {
    const first = renderHook(() => useActiveHillList());

    await waitFor(() => {
      expect(first.result.current.peaks).toHaveLength(214);
    });
    first.unmount();

    const second = renderHook(() => useActiveHillList());

    expect(second.result.current.peaks).toHaveLength(214);
  });

  it('never shows the previous list peaks while a switched-to list loads', async () => {
    const { result } = renderHook(() => useActiveHillList());

    await waitFor(() => {
      expect(result.current.peaks).toHaveLength(214);
    });

    const wainwrightPeak = result.current.peaks[0];

    if (!wainwrightPeak) {
      throw new Error('Expected the Wainwrights to have loaded');
    }

    act(() => {
      usePreferencesStore.getState().setActiveListId('munros');
    });

    // The new list is active immediately, with no stale Wainwright peaks
    // shown under the Munros header while the Munro data is still loading.
    expect(result.current.list.id).toBe('munros');
    expect(result.current.peaks).toEqual([]);

    const munroPeak: Peak = { ...wainwrightPeak, id: 'munro:1', name: 'Test Munro' };

    act(() => {
      munrosDeferred.resolve([munroPeak]);
    });

    await waitFor(() => {
      expect(result.current.peaks).toEqual([munroPeak]);
    });

    // Switching back serves the cached Wainwrights synchronously.
    act(() => {
      usePreferencesStore.getState().setActiveListId('wainwrights');
    });

    expect(result.current.list.id).toBe('wainwrights');
    expect(result.current.peaks).toHaveLength(214);
  });

  it('surfaces a failed peak load and recovers on retry', async () => {
    act(() => {
      usePreferencesStore.getState().setActiveListId('corbetts');
    });

    const { result } = renderHook(() => useActiveHillList());

    await waitFor(() => {
      expect(result.current.loadFailed).toBe(true);
    });
    expect(result.current.peaks).toEqual([]);

    act(() => {
      result.current.retryLoad();
    });

    await waitFor(() => {
      expect(result.current.peaks).toHaveLength(214);
    });
    expect(result.current.loadFailed).toBe(false);
  });

  it('heals every mounted instance when one of them retries a failed load', async () => {
    act(() => {
      usePreferencesStore.getState().setActiveListId('grahams');
    });

    // App and MapView each mount their own instance of the hook.
    const appInstance = renderHook(() => useActiveHillList());
    const mapInstance = renderHook(() => useActiveHillList());

    await waitFor(() => {
      expect(appInstance.result.current.loadFailed).toBe(true);
      expect(mapInstance.result.current.loadFailed).toBe(true);
    });

    // Retry from the map panel only; the other instance must recover too.
    act(() => {
      mapInstance.result.current.retryLoad();
    });

    await waitFor(() => {
      expect(mapInstance.result.current.peaks).toHaveLength(214);
      expect(appInstance.result.current.peaks).toHaveLength(214);
    });
    expect(appInstance.result.current.loadFailed).toBe(false);
  });
});
