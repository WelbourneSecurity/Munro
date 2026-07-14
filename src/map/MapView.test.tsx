import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { FeatureCollection } from 'geojson';
import { act, fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';

import wainwrights from '../data/wainwrights.json';
import { usePreferencesStore, useProgressStore } from '../store';
import { MapView } from './MapView';

// Record the data handed to each Source so tests can inspect the marker /
// hill-area feature properties the map would render.
const sourceData = new Map<string, FeatureCollection>();
// Track which Sources are currently mounted (the terrain-dem source must
// survive the Terrain toggle) and the latest props of each Layer and of the
// Map itself, so tests can inspect terrain state and layer filters.
const mountedSourceIds = new Set<string>();
const layerProps = new Map<string, Record<string, unknown>>();
const mapProps: { current: Record<string, unknown> } = { current: {} };

vi.mock('@vis.gl/react-maplibre', () => ({
  Map: ({ children, ...props }: { children?: ReactNode }) => {
    mapProps.current = props;
    return <div>{children}</div>;
  },
  AttributionControl: () => null,
  NavigationControl: () => null,
  Source: ({
    id,
    data,
    children,
  }: {
    id?: string;
    data?: unknown;
    children?: ReactNode;
  }) => {
    if (id && data && typeof data === 'object') {
      sourceData.set(id, data as FeatureCollection);
    }
    useEffect(() => {
      if (!id) {
        return undefined;
      }

      mountedSourceIds.add(id);
      return () => {
        mountedSourceIds.delete(id);
      };
    }, [id]);
    return <>{children}</>;
  },
  Layer: (props: { id?: string } & Record<string, unknown>) => {
    if (props.id) {
      layerProps.set(props.id, props);
    }
    return null;
  },
}));

vi.mock('./terrain', () => ({
  setupTerrainProtocols: vi.fn(),
  terrainDemSource: { sharedDemProtocolUrl: 'munro-dem://tile' },
  contourTileUrl: 'munro-contour://tile',
}));

// jsdom has no WebGL2, so the real check would always report the map as
// unsupported; default to supported and let one test flip it.
const mapSupport = vi.hoisted(() => ({ error: null as string | null }));

vi.mock('./support', () => ({
  getMapSupportError: () => mapSupport.error,
}));

const firstPeakId = (wainwrights.peaks as { id: string }[])[0]?.id;

if (!firstPeakId) {
  throw new Error('Expected wainwrights.json to contain at least one peak');
}

describe('MapView panel accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetAll();
    // The hill-area assertions need the Wainwrights' lighting profiles,
    // not the collated default list.
    usePreferencesStore.getState().setActiveListId('wainwrights');
    sourceData.clear();
    layerProps.clear();
  });

  // The generous timeout absorbs coverage-instrumented full-list renders on
  // a busy machine; the interactions themselves are synchronous.
  it(
    'bags and unbags the selected peak from the panel without the map',
    { timeout: 15_000 },
    async () => {
      const { findByRole, getByRole } = render(<MapView />);

      // "Ard Crags" is a list row; selecting it works from the keyboardable
      // list. The active list's peaks load lazily, so await the first row.
      fireEvent.click(await findByRole('button', { name: /Ard Crags/ }));
      fireEvent.click(getByRole('button', { name: 'Mark bagged' }));

      expect(useProgressStore.getState().progressByPeakId['dobih-2460']?.bagged).toBe(
        true,
      );

      fireEvent.click(getByRole('button', { name: 'Mark unbagged' }));

      // The record survives the unbag (bagged: false) so the date entered
      // through the panel is preserved against an accidental tap.
      expect(useProgressStore.getState().progressByPeakId['dobih-2460']?.bagged).toBe(
        false,
      );
    },
  );

  it('drops the selection highlight from the hill-area layers while exporting', async () => {
    const { findByRole, getByRole } = render(<MapView />);

    // Select an unbagged peak: its hill area is highlighted through the
    // hill-area layer filter/paint for the on-screen highlight.
    fireEvent.click(await findByRole('button', { name: /Ard Crags/ }));
    expect(JSON.stringify(layerProps.get('hill-area-fill')?.filter)).toContain(
      'dobih-2460',
    );
    expect(JSON.stringify(layerProps.get('hill-area-line')?.paint)).toContain(
      'dobih-2460',
    );

    // Opening the export dialog must clear it so the captured image never
    // paints the selected (unbagged) peak with the bagged green.
    fireEvent.click(getByRole('button', { name: 'Export image' }));
    expect(JSON.stringify(layerProps.get('hill-area-fill')?.filter)).not.toContain(
      'dobih-2460',
    );
    expect(JSON.stringify(layerProps.get('hill-area-line')?.paint)).not.toContain(
      'dobih-2460',
    );
  });

  it('never rewrites the hill-area source data for a selection change', async () => {
    const { findByRole, getByRole } = render(<MapView />);

    await findByRole('button', { name: /Ard Crags/ });
    const dataBefore = sourceData.get('wainwright-areas');
    expect(dataBefore?.features.length).toBeGreaterThan(0);
    // Selection is expressed in the layer filter, not baked into feature
    // properties, so the ~1 MB collection is never re-uploaded via setData.
    expect(
      dataBefore?.features.some((feature) => 'selected' in (feature.properties ?? {})),
    ).toBe(false);

    fireEvent.click(getByRole('button', { name: /Ard Crags/ }));
    fireEvent.click(getByRole('button', { name: 'Export image' }));

    expect(sourceData.get('wainwright-areas')).toBe(dataBefore);
  });

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

describe('MapView terrain toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetAll();
    usePreferencesStore.getState().setActiveListId('wainwrights');
    usePreferencesStore.getState().setTerrainEnabled(true);
    mountedSourceIds.clear();
    mapProps.current = {};
  });

  it('passes an explicit null terrain when unchecked and restores it when re-checked', () => {
    const { getByRole } = render(<MapView />);
    const toggle = getByRole('checkbox', { name: 'Terrain' });

    expect(mapProps.current.terrain).toEqual({
      source: 'terrain-dem',
      exaggeration: 1.28,
    });

    // The explicit null (never undefined) makes react-maplibre call
    // map.setTerrain(null); an absent terrain prop means "leave unchanged"
    // and would keep the 3D displacement active after unchecking.
    fireEvent.click(toggle);
    expect(mapProps.current.terrain).toBeNull();

    fireEvent.click(toggle);
    expect(mapProps.current.terrain).toEqual({
      source: 'terrain-dem',
      exaggeration: 1.28,
    });
  });

  it('keeps the terrain-dem source mounted while terrain is off', () => {
    const { getByRole } = render(<MapView />);

    expect(mountedSourceIds.has('terrain-dem')).toBe(true);

    fireEvent.click(getByRole('checkbox', { name: 'Terrain' }));

    // Removing the DEM source under active terrain leaves MapLibre holding
    // a dead tile manager, and re-enabling must find the source already
    // present. Only the overlay-specific sources unmount with the toggle.
    expect(mountedSourceIds.has('terrain-dem')).toBe(true);
    expect(mountedSourceIds.has('terrain-hillshade-dem')).toBe(false);
    expect(mountedSourceIds.has('terrain-contours')).toBe(false);
  });
});

function notesFor(peakId: string) {
  return useProgressStore.getState().progressByPeakId[peakId]?.notes;
}

describe('MapView notes persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetAll();
    usePreferencesStore.getState().setActiveListId('wainwrights');
    useProgressStore.getState().bag(firstPeakId, '2026-07-10');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('commits notes to the store on blur', async () => {
    const { findByLabelText } = render(<MapView />);
    const textarea = await findByLabelText('Notes');

    fireEvent.change(textarea, { target: { value: 'Clear summit views' } });
    expect(notesFor(firstPeakId)).toBeUndefined();

    fireEvent.blur(textarea);
    expect(notesFor(firstPeakId)).toBe('Clear summit views');
  });

  it('flushes pending notes on pagehide without a blur', async () => {
    const { findByLabelText } = render(<MapView />);

    fireEvent.change(await findByLabelText('Notes'), {
      target: { value: 'Typed then reloaded' },
    });

    window.dispatchEvent(new Event('pagehide'));

    expect(notesFor(firstPeakId)).toBe('Typed then reloaded');
  });

  it('flushes pending notes on a focus-preserving hash navigation that unmounts the view', async () => {
    const { findByLabelText, unmount } = render(<MapView />);
    const textarea = await findByLabelText('Notes');

    textarea.focus();
    fireEvent.change(textarea, { target: { value: 'Typed then pressed Back' } });

    // Browser Back/Forward (or a mobile back gesture) fires hashchange without
    // blurring the textarea, then the router unmounts MapView. Removing a
    // focused element fires no blur, so the hashchange flush must commit.
    window.dispatchEvent(new Event('hashchange'));
    unmount();

    expect(notesFor(firstPeakId)).toBe('Typed then pressed Back');
  });

  it('flushes pending notes when the page becomes hidden', async () => {
    const { findByLabelText } = render(<MapView />);

    fireEvent.change(await findByLabelText('Notes'), {
      target: { value: 'Backgrounded PWA' },
    });

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(notesFor(firstPeakId)).toBe('Backgrounded PWA');
  });

  it('never writes the stale textarea back over an external notes update', async () => {
    const { findByLabelText } = render(<MapView />);
    await findByLabelText('Notes');

    // Another context (a second tab or the installed PWA window) edits the
    // same peak's notes and the storage listener rehydrates this store. The
    // uncontrolled textarea still shows the old text — but the user never
    // typed here, so hiding this tab must not flush the stale value back.
    act(() => {
      useProgressStore.getState().setNotes(firstPeakId, 'Edited elsewhere');
    });

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(notesFor(firstPeakId)).toBe('Edited elsewhere');
  });
});

describe('MapView without map support (iOS Lockdown Mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetAll();
    mapSupport.error = 'This browser has WebGL disabled.';
  });

  afterEach(() => {
    mapSupport.error = null;
  });

  it('explains the unavailable map and keeps the tracker panel usable', async () => {
    const { findByRole, getByRole, getByText, queryByRole } = render(<MapView />);

    expect(getByRole('status')).toBeVisible();
    expect(getByText('Map unavailable')).toBeVisible();
    expect(getByText('This browser has WebGL disabled.')).toBeVisible();
    expect(getByRole('button', { name: 'Export image' })).toBeDisabled();
    expect(queryByRole('region', { name: 'Map' })).not.toBeInTheDocument();

    // Bagging still works from the panel.
    fireEvent.click(await findByRole('button', { name: /Ard Crags/ }));
    fireEvent.click(getByRole('button', { name: 'Mark bagged' }));

    expect(useProgressStore.getState().progressByPeakId['dobih-2460']?.bagged).toBe(
      true,
    );
  });
});
