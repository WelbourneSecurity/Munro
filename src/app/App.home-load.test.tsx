import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { Peak } from '../domain';
import { usePreferencesStore, useProgressStore } from '../store';
import { App } from './App';

vi.mock('../map', () => ({
  MapView: () => <main aria-label="Munro tracker">Munro map</main>,
}));

const testPeak = vi.hoisted((): Peak => ({
  id: 'dobih-1',
  dobihId: 1,
  name: 'High Fell',
  list: ['wainwrights'],
  region: 'Test Fells',
  heightM: 900,
  lat: 54.5,
  lon: -3.1,
}));

const munrosDeferred = vi.hoisted(() => {
  let resolve!: (peaks: Peak[]) => void;
  const promise = new Promise<Peak[]>((res) => {
    resolve = res;
  });

  return { promise, resolve };
});

const corbettsState = vi.hoisted(() => ({ calls: 0 }));

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

        // App and HomePage each mount a hook instance, so the initial render
        // issues two loads — fail both, then succeed on the retry.
        return corbettsState.calls <= 2
          ? Promise.reject(new Error('chunk load failed'))
          : Promise.resolve([testPeak]);
      },
    },
  ];

  return {
    ...actual,
    HILL_LISTS: lists,
    getHillList: (id: string) => lists.find((list) => list.id === id) ?? wainwrights,
  };
});

describe('App home page peak-data loading', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetAll();
    history.replaceState(null, '', '/#/');
  });

  it('shows a loading line instead of asserting empty progress while peaks load', async () => {
    usePreferencesStore.getState().setActiveListId('munros');
    useProgressStore.getState().bag(testPeak.id);

    const { getByText, queryByText } = render(<App />);

    // A user with existing records must never be told to "start bagging"
    // just because the peak-data chunk has not resolved yet.
    expect(getByText('Loading peak data…')).toBeVisible();
    expect(
      queryByText('Start bagging to build your local progress record.'),
    ).toBeNull();

    await act(async () => {
      munrosDeferred.resolve([testPeak]);
      await munrosDeferred.promise;
    });

    expect(getByText('1 / 1 bagged')).toBeVisible();
  });

  it('surfaces a failed peak-data load with a retry instead of the empty state', async () => {
    usePreferencesStore.getState().setActiveListId('corbetts');
    useProgressStore.getState().bag(testPeak.id);

    const user = userEvent.setup();
    const { findByRole, findByText, queryByText } = render(<App />);

    expect(
      await findByText(
        'Peak data could not be loaded. Check your connection and try again.',
      ),
    ).toBeVisible();
    expect(
      queryByText('Start bagging to build your local progress record.'),
    ).toBeNull();

    await user.click(await findByRole('button', { name: 'Retry' }));

    expect(await findByText('1 / 1 bagged')).toBeVisible();
  });
});
