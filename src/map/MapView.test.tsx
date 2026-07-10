import type { ReactNode } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';

import wainwrights from '../data/wainwrights.json';
import { useProgressStore } from '../store';
import { MapView } from './MapView';

vi.mock('@vis.gl/react-maplibre', () => ({
  Map: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AttributionControl: () => null,
  NavigationControl: () => null,
  Source: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Layer: () => null,
}));

vi.mock('./terrain', () => ({
  setupTerrainProtocols: vi.fn(),
  terrainDemSource: { sharedDemProtocolUrl: 'munro-dem://tile' },
  contourTileUrl: 'munro-contour://tile',
}));

const firstPeakId = (wainwrights.peaks as { id: string }[])[0]?.id;

if (!firstPeakId) {
  throw new Error('Expected wainwrights.json to contain at least one peak');
}

describe('MapView panel accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetAll();
  });

  // The generous timeout absorbs coverage-instrumented full-list renders on
  // a busy machine; the interactions themselves are synchronous.
  it(
    'bags and unbags the selected peak from the panel without the map',
    { timeout: 15_000 },
    () => {
      const { getByRole } = render(<MapView />);

      // "Ard Crags" is a list row; selecting it works from the keyboardable list.
      fireEvent.click(getByRole('button', { name: /Ard Crags/ }));
      fireEvent.click(getByRole('button', { name: 'Mark bagged' }));

      expect(useProgressStore.getState().progressByPeakId['dobih-2460']?.bagged).toBe(
        true,
      );

      fireEvent.click(getByRole('button', { name: 'Mark unbagged' }));

      expect(
        useProgressStore.getState().progressByPeakId['dobih-2460']?.bagged,
      ).toBeUndefined();
    },
  );

  it(
    'exposes a collapsible bottom-sheet toggle for small screens',
    { timeout: 15_000 },
    () => {
      const { getByRole } = render(<MapView />);
      const toggle = getByRole('button', { name: 'Hide panel' });

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(toggle).toHaveAttribute('aria-controls', 'tracker-panel-content');

      fireEvent.click(toggle);

      expect(getByRole('button', { name: 'Show panel' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(document.getElementById('tracker-panel-content')?.className).toContain(
        'max-lg:hidden',
      );

      fireEvent.click(getByRole('button', { name: 'Show panel' }));

      expect(document.getElementById('tracker-panel-content')?.className).not.toContain(
        'max-lg:hidden',
      );
    },
  );
});

function notesFor(peakId: string) {
  return useProgressStore.getState().progressByPeakId[peakId]?.notes;
}

describe('MapView notes persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetAll();
    useProgressStore.getState().bag(firstPeakId, '2026-07-10');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('commits notes to the store on blur', () => {
    const { getByLabelText } = render(<MapView />);
    const textarea = getByLabelText('Notes');

    fireEvent.change(textarea, { target: { value: 'Clear summit views' } });
    expect(notesFor(firstPeakId)).toBeUndefined();

    fireEvent.blur(textarea);
    expect(notesFor(firstPeakId)).toBe('Clear summit views');
  });

  it('flushes pending notes on pagehide without a blur', () => {
    const { getByLabelText } = render(<MapView />);

    fireEvent.change(getByLabelText('Notes'), {
      target: { value: 'Typed then reloaded' },
    });

    window.dispatchEvent(new Event('pagehide'));

    expect(notesFor(firstPeakId)).toBe('Typed then reloaded');
  });

  it('flushes pending notes when the page becomes hidden', () => {
    const { getByLabelText } = render(<MapView />);

    fireEvent.change(getByLabelText('Notes'), {
      target: { value: 'Backgrounded PWA' },
    });

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(notesFor(firstPeakId)).toBe('Backgrounded PWA');
  });
});
