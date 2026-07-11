import { renderHook, waitFor } from '@testing-library/react';

import { usePreferencesStore } from '../store';
import { useActiveHillList } from './useActiveHillList';

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
});
