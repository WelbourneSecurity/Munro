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
