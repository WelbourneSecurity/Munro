import { fireEvent, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import type { HillListDefinition } from '../data/lists';
import type { Peak } from '../domain';
import { useProgressStore } from '../store';
import { App } from './App';

const peak: Peak = {
  id: 'dobih-1',
  dobihId: 1,
  name: 'Test Summit',
  list: ['W'],
  region: 'Lake District - Eastern Fells',
  heightM: 800,
  heightFt: 2625,
  lat: 54.5,
  lon: -3,
  gridRef: 'NY123456',
};
const list: HillListDefinition = {
  id: 'wainwrights',
  name: 'Wainwrights',
  regionLabel: 'Lake District',
  peakNoun: 'fells',
  bounds: [
    [-3.5, 54.1],
    [-2.5, 54.8],
  ],
  initialView: { longitude: -3, latitude: 54.5, zoom: 8, bearing: 0, pitch: 0 },
  hasHillLighting: true,
  loadPeaks: () => Promise.resolve([peak]),
};

vi.mock('../components/useActiveHillList', () => ({
  useActiveHillList: () => ({
    list,
    peaks: [peak],
    loadFailed: false,
    retryLoad: vi.fn(),
  }),
}));
vi.mock('../map', () => ({
  MapView: ({ onSelectPeak }: { onSelectPeak: (id: string) => void }) => (
    <button
      type="button"
      onClick={() => {
        onSelectPeak('dobih-1');
      }}
    >
      Select Test Summit
    </button>
  ),
}));
vi.mock('../hooks', () => ({
  useSummitDetection: () => ({
    status: 'idle',
    detectedPeaks: [],
    dismissDetections: vi.fn(),
  }),
}));

describe('App shell', () => {
  beforeEach(() => {
    window.location.hash = '#/explore';
    localStorage.clear();
    useProgressStore.setState({ progressByPeakId: {} });
  });

  it('uses Explore as the default and preserves legacy tracker routing', () => {
    const { getByRole, rerender } = render(<App />);
    expect(getByRole('link', { name: 'Munro — open Explore' })).toBeVisible();
    expect(getByRole('button', { name: 'Find a hill' })).toBeVisible();
    window.location.hash = '#/tracker';
    fireEvent(window, new HashChangeEvent('hashchange'));
    rerender(<App />);
    expect(getByRole('button', { name: 'Find a hill' })).toBeVisible();
  });

  it('renders the shared Logbook and Settings routes', () => {
    window.location.hash = '#/logbook';
    const { getByRole, rerender } = render(<App />);
    expect(
      getByRole('heading', { name: 'Your United Kingdom logbook.' }),
    ).toBeVisible();
    window.location.hash = '#/data';
    fireEvent(window, new HashChangeEvent('hashchange'));
    rerender(<App />);
    expect(getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  it('switches geographic editions and changes the product identity', () => {
    const { getByRole } = render(<App />);

    fireEvent.click(getByRole('button', { name: 'Change range, United Kingdom' }));
    fireEvent.click(getByRole('button', { name: /Scotland/ }));

    expect(getByRole('link', { name: 'Scotland — open Explore' })).toBeVisible();
    expect(localStorage.getItem('munro.range.v1')).toBe('scotland');
  });

  it('bags from the shared inspector and restores the exact record with Undo', async () => {
    useProgressStore.setState({
      progressByPeakId: {
        'dobih-1': { peakId: 'dobih-1', bagged: false, notes: 'Keep me' },
      },
    });
    const { getByRole, getByText } = render(<App />);
    fireEvent.click(getByRole('button', { name: 'Select Test Summit' }));
    fireEvent.click(getByRole('button', { name: 'Bag this hill' }));
    expect(getByText('Test Summit added to your logbook.')).toBeVisible();
    fireEvent.click(getByRole('button', { name: 'Undo' }));
    await waitFor(() => {
      expect(useProgressStore.getState().progressByPeakId['dobih-1']).toEqual({
        peakId: 'dobih-1',
        bagged: false,
        notes: 'Keep me',
      });
    });
  });
});
