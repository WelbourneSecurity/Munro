import { act, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import type { Peak, ProgressStats, RangeEditionView } from '../domain';
import { usePreferencesStore } from '../store';
import { MapView } from './MapView';

const mapProps: { current: Record<string, unknown> } = vi.hoisted(() => ({
  current: {},
}));
const layerProps: { current: Record<string, Record<string, unknown>> } = vi.hoisted(
  () => ({ current: {} }),
);
const fakeMap = vi.hoisted(() => {
  const bounds = {
    getWest: () => -3.8,
    getSouth: () => 54,
    getEast: () => -2.4,
    getNorth: () => 54.9,
  };
  return {
    setMaxBounds: vi.fn(),
    setMinZoom: vi.fn(),
    fitBounds: vi.fn(),
    getBounds: vi.fn(() => bounds),
    getZoom: vi.fn(() => 8.2),
    getCenter: vi.fn(() => ({ lng: -3, lat: 54.5 })),
    getBearing: vi.fn(() => -12),
    getPitch: vi.fn(() => 38),
    getMinZoom: vi.fn(() => 7.4),
    getMaxBounds: vi.fn(() => bounds),
    loaded: vi.fn(() => true),
    jumpTo: vi.fn(),
    once: vi.fn((_event: string, callback: () => void) => {
      queueMicrotask(callback);
    }),
    flyTo: vi.fn(),
  };
});
const exportProps: { current: Record<string, unknown> } = vi.hoisted(() => ({
  current: {},
}));
const captureEngine = vi.hoisted(() => {
  const restore = vi.fn();
  return {
    restore,
    waitForMapIdle: vi.fn(() => Promise.resolve()),
    frameBoundary: vi.fn(() => Promise.resolve(restore)),
    captureMap: vi.fn(() =>
      Promise.resolve({
        blob: new Blob(['map'], { type: 'image/png' }),
        width: 100,
        height: 100,
        pixelRatio: 1,
      }),
    ),
  };
});
const supportError = vi.hoisted(() => ({ current: null as string | null }));

vi.mock('@vis.gl/react-maplibre', async () => {
  const React = await import('react');
  return {
    Map: React.forwardRef(
      (
        props: Record<string, unknown> & { children?: React.ReactNode },
        ref: React.ForwardedRef<unknown>,
      ) => {
        mapProps.current = props;
        React.useImperativeHandle(ref, () => ({ getMap: () => fakeMap }));
        return React.createElement('div', { 'aria-label': 'Map' }, props.children);
      },
    ),
    Source: ({ id, children }: { id: string; children?: React.ReactNode }) =>
      React.createElement('div', { 'data-source-id': id }, children),
    Layer: (props: { id: string } & Record<string, unknown>) => {
      layerProps.current[props.id] = props;
      return React.createElement('div', { 'data-layer-id': props.id });
    },
    AttributionControl: () => null,
    NavigationControl: () => null,
  };
});
vi.mock('./terrain', () => ({
  setupTerrainProtocols: vi.fn(),
  contourTileUrl: 'contours://tiles',
  terrainDemSource: { sharedDemProtocolUrl: 'dem://tiles' },
}));
vi.mock('./support', () => ({ getMapSupportError: () => supportError.current }));
vi.mock('../components/ExportDialog', () => ({
  ExportDialog: (next: Record<string, unknown>) => {
    exportProps.current = next;
    return null;
  },
}));
vi.mock('../export', () => ({
  waitForMapIdle: captureEngine.waitForMapIdle,
  frameBoundary: captureEngine.frameBoundary,
  captureMap: captureEngine.captureMap,
}));

const peak: Peak = {
  id: 'dobih-1',
  dobihId: 1,
  name: 'Test Summit',
  list: ['W'],
  region: 'Test',
  heightM: 800,
  lat: 54.5,
  lon: -3,
};
const edition: RangeEditionView = {
  id: 'wainwrights',
  key: 'range:wainwrights',
  name: 'Wainwrights',
  identity: 'Wainwrights',
  descriptor: 'The 214 fells and every Outlying Fell',
  peakNoun: 'fells',
  bounds: [
    [-3.5, 54.1],
    [-2.5, 54.8],
  ],
  frameBounds: [
    [-3.57, 54.1],
    [-2.62, 54.82],
  ],
  initialView: { longitude: -3, latitude: 54.5, zoom: 8, bearing: 0, pitch: 0 },
  peaks: [peak],
};
const stats: ProgressStats = {
  total: 1,
  bagged: 0,
  remaining: 1,
  percentage: 0,
  recent: [],
};
const props = {
  edition,
  peaks: [peak],
  stats,
  selectedPeakId: undefined,
  onSelectPeak: vi.fn(),
};

describe('MapView', () => {
  beforeEach(() => {
    supportError.current = null;
    props.onSelectPeak.mockClear();
    vi.clearAllMocks();
    layerProps.current = {};
    exportProps.current = {};
    usePreferencesStore.setState({ terrainEnabled: true, visualPreset: 'midnight' });
    window.matchMedia = vi.fn(() => ({
      matches: false,
    })) as unknown as typeof window.matchMedia;
  });

  it('renders survey markers without approximate hill-area polygons', () => {
    const { container } = render(<MapView {...props} />);
    expect(
      container.querySelector('[data-source-id="list-peaks"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-layer-id="survey-peak-markers"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-source-id="hill-areas"]'),
    ).not.toBeInTheDocument();
  });

  it('uses the selected palette and disables world copies', () => {
    usePreferencesStore.setState({ visualPreset: 'light' });
    render(<MapView {...props} />);
    expect(mapProps.current.renderWorldCopies).toBe(false);
    const style = mapProps.current.mapStyle as {
      layers: { id: string; paint?: object }[];
    };
    expect(style.layers.find((layer) => layer.id === 'background')?.paint).toEqual({
      'background-color': '#f2efe7',
    });
  });

  it('fits the curated frame and locks the visible envelope and minimum zoom', async () => {
    render(<MapView {...props} />);
    const onLoad = mapProps.current.onLoad as () => void;
    act(() => {
      onLoad();
    });

    await waitFor(() => {
      expect(fakeMap.fitBounds).toHaveBeenCalledWith(
        edition.frameBounds,
        expect.objectContaining({ bearing: 0, pitch: 0 }),
      );
    });
    await waitFor(() => {
      expect(fakeMap.setMaxBounds).toHaveBeenLastCalledWith([
        [-3.8, 54],
        [-2.4, 54.9],
      ]);
      expect(fakeMap.setMinZoom).toHaveBeenLastCalledWith(8.2);
    });
  });

  it('limits UK hit targets and ordinary markers to bagged hills', () => {
    render(<MapView {...props} edition={{ ...edition, id: 'uk' }} />);
    expect(layerProps.current['peak-hitbox']?.filter).toEqual([
      '==',
      ['get', 'bagged'],
      true,
    ]);
    expect(layerProps.current['survey-peak-markers']?.filter).toEqual([
      'all',
      ['!=', ['get', 'selected'], true],
      ['==', ['get', 'bagged'], true],
    ]);
  });

  it('captures a bagged-only alternate palette and restores the exact map state', async () => {
    render(<MapView {...props} />);
    const capture = exportProps.current.capturePosterMap as (
      request: object,
    ) => Promise<unknown>;
    const result = capture({
      palette: 'nature',
      bounds: edition.frameBounds,
      aspect: 1.2,
    });

    await expect(result).resolves.toEqual(
      expect.objectContaining({ width: 100, height: 100 }),
    );
    expect(captureEngine.frameBoundary).toHaveBeenCalledWith(
      fakeMap,
      edition.frameBounds,
      48,
      1.2,
    );
    expect(captureEngine.restore).toHaveBeenCalledTimes(1);
    expect(fakeMap.jumpTo).toHaveBeenCalledWith({
      center: [-3, 54.5],
      zoom: 8.2,
      bearing: -12,
      pitch: 38,
    });
    expect(fakeMap.setMaxBounds).toHaveBeenLastCalledWith([
      [-3.8, 54],
      [-2.4, 54.9],
    ]);
    expect(fakeMap.setMinZoom).toHaveBeenLastCalledWith(7.4);
  });

  it('reports a clicked summit through shared selection', () => {
    render(<MapView {...props} />);
    const onClick = mapProps.current.onClick as (event: unknown) => void;
    onClick({ features: [{ properties: { id: 'dobih-1' } }] });
    expect(props.onSelectPeak).toHaveBeenCalledWith('dobih-1');
  });

  it('keeps the accessible Logbook available when maps are unsupported', () => {
    supportError.current = 'This browser has WebGL disabled.';
    const { getByRole, getByText } = render(<MapView {...props} />);
    expect(getByText('Map unavailable')).toBeVisible();
    expect(getByRole('link', { name: 'Open the accessible logbook' })).toHaveAttribute(
      'href',
      '#/logbook',
    );
  });
});
