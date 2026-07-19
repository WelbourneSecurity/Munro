import { render } from '@testing-library/react';
import { vi } from 'vitest';

import type { HillListDefinition } from '../data/lists';
import type { Peak, ProgressStats } from '../domain';
import { usePreferencesStore } from '../store';
import { MapView } from './MapView';

const mapProps: { current: Record<string, unknown> } = vi.hoisted(() => ({
  current: {},
}));
const supportError = vi.hoisted(() => ({ current: null as string | null }));

vi.mock('@vis.gl/react-maplibre', async () => {
  const React = await import('react');
  return {
    Map: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
      mapProps.current = props;
      return React.createElement('div', { 'aria-label': 'Map' }, props.children);
    },
    Source: ({ id, children }: { id: string; children?: React.ReactNode }) =>
      React.createElement('div', { 'data-source-id': id }, children),
    Layer: ({ id }: { id: string }) =>
      React.createElement('div', { 'data-layer-id': id }),
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
vi.mock('../components/ExportDialog', () => ({ ExportDialog: () => null }));

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
const stats: ProgressStats = {
  total: 1,
  bagged: 0,
  remaining: 1,
  percentage: 0,
  recent: [],
};
const props = {
  list,
  peaks: [peak],
  stats,
  selectedPeakId: undefined,
  onSelectPeak: vi.fn(),
};

describe('MapView', () => {
  beforeEach(() => {
    supportError.current = null;
    props.onSelectPeak.mockClear();
    usePreferencesStore.setState({ terrainEnabled: true });
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
