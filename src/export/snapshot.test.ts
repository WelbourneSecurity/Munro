import type { FeatureCollection, Polygon } from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';

import boundaryRaw from '../data/boundaries/lake-district.geojson?raw';
import wainwrights from '../data/wainwrights.json';
import { LAKE_DISTRICT_BOUNDS } from '../map/config';
import { captureMap, frameBoundary, waitForMapIdle } from './snapshot';

interface MockCanvasOptions {
  width?: number;
  height?: number;
  blob?: Blob | null;
}

function createMockCanvas(options: MockCanvasOptions = {}) {
  const {
    width = 1600,
    height = 2000,
    blob = new Blob(['png'], { type: 'image/png' }),
  } = options;

  return {
    width,
    height,
    toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
      callback(blob);
    }),
  };
}

interface MockMapOptions {
  loaded?: boolean;
  moving?: boolean;
  fittable?: boolean;
  canvas?: ReturnType<typeof createMockCanvas>;
  pixelRatio?: number;
}

function createMockMap(options: MockMapOptions = {}) {
  const {
    loaded = true,
    moving = false,
    fittable = true,
    canvas = createMockCanvas(),
    pixelRatio = 1,
  } = options;
  const idleListeners: (() => void)[] = [];

  const map = {
    idleListeners,
    fireIdle() {
      const listeners = idleListeners.splice(0);
      for (const listener of listeners) {
        listener();
      }
    },
    loaded: vi.fn(() => loaded),
    isMoving: vi.fn(() => moving),
    cameraForBounds: vi.fn(() =>
      fittable ? { center: { lng: -3.08, lat: 54.53 }, zoom: 8.6 } : undefined,
    ),
    once: vi.fn((event: string, listener: () => void) => {
      expect(event).toBe('idle');
      idleListeners.push(listener);
    }),
    getCanvas: vi.fn(() => canvas),
    getPixelRatio: vi.fn(() => pixelRatio),
    getCenter: vi.fn(() => ({ lng: -3.21, lat: 54.61 })),
    getZoom: vi.fn(() => 11.4),
    getBearing: vi.fn(() => -12),
    getPitch: vi.fn(() => 38),
    fitBounds: vi.fn<(bounds: unknown, options?: unknown) => void>(() => {
      map.fireIdle();
    }),
    jumpTo: vi.fn(),
  };

  return map;
}

function asMap(map: unknown): MapLibreMap {
  return map as MapLibreMap;
}

describe('waitForMapIdle', () => {
  it('resolves immediately when the map is already idle', async () => {
    const map = createMockMap({ loaded: true });

    await waitForMapIdle(asMap(map));

    expect(map.once).not.toHaveBeenCalled();
  });

  it('waits for idle when the map is loaded but the camera is still moving', async () => {
    // maplibre's loaded() reports true between the frames of a camera
    // animation — capturing then would snapshot a mid-flight frame.
    const map = createMockMap({ loaded: true, moving: true });
    let resolved = false;

    const pending = waitForMapIdle(asMap(map)).then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(map.once).toHaveBeenCalledWith('idle', expect.any(Function));

    map.fireIdle();
    await pending;
    expect(resolved).toBe(true);
  });

  it('waits for the idle event otherwise', async () => {
    const map = createMockMap({ loaded: false });
    let resolved = false;

    const pending = waitForMapIdle(asMap(map)).then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(map.once).toHaveBeenCalledWith('idle', expect.any(Function));

    map.fireIdle();
    await pending;
    expect(resolved).toBe(true);
  });
});

describe('captureMap', () => {
  it('returns the PNG blob with physical dimensions and pixel ratio', async () => {
    const blob = new Blob(['snapshot'], { type: 'image/png' });
    const map = createMockMap({ canvas: createMockCanvas({ blob }) });

    const snapshot = await captureMap(asMap(map));

    expect(snapshot).toEqual({ blob, width: 1600, height: 2000, pixelRatio: 1 });
  });

  it('reports DPR 2 canvases at their full physical size', async () => {
    const map = createMockMap({
      canvas: createMockCanvas({ width: 3200, height: 4000 }),
      pixelRatio: 2,
    });

    const snapshot = await captureMap(asMap(map));

    expect(snapshot.width).toBe(3200);
    expect(snapshot.height).toBe(4000);
    expect(snapshot.pixelRatio).toBe(2);
  });

  it('waits for idle before reading the canvas', async () => {
    const map = createMockMap({ loaded: false });

    const pending = captureMap(asMap(map));
    await Promise.resolve();
    expect(map.getCanvas).not.toHaveBeenCalled();

    map.fireIdle();
    await pending;
    expect(map.getCanvas).toHaveBeenCalledTimes(1);
  });

  it('includes a decoded bitmap when createImageBitmap exists', async () => {
    const bitmap = { close: vi.fn() };
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => Promise.resolve(bitmap)),
    );

    try {
      const snapshot = await captureMap(asMap(createMockMap()));

      expect(snapshot.bitmap).toBe(bitmap);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects when the canvas has no pixels', async () => {
    const map = createMockMap({ canvas: createMockCanvas({ width: 0, height: 0 }) });

    await expect(captureMap(asMap(map))).rejects.toThrow(
      'Map canvas has no pixels to capture',
    );
  });

  it('rejects when the canvas cannot encode a blob', async () => {
    const map = createMockMap({ canvas: createMockCanvas({ blob: null }) });

    await expect(captureMap(asMap(map))).rejects.toThrow(
      'Map canvas produced an empty snapshot',
    );
  });
});

describe('frameBoundary', () => {
  it('fits the given bounds north-up and flat, then waits for idle', async () => {
    const map = createMockMap();

    await frameBoundary(asMap(map), LAKE_DISTRICT_BOUNDS);

    expect(map.fitBounds).toHaveBeenCalledWith(LAKE_DISTRICT_BOUNDS, {
      animate: false,
      bearing: 0,
      padding: 48,
      pitch: 0,
    });
    // The idle listener is registered before the camera moves.
    const onceOrder = map.once.mock.invocationCallOrder[0];
    const fitOrder = map.fitBounds.mock.invocationCallOrder[0];
    expect(onceOrder).toBeLessThan(fitOrder ?? 0);
  });

  it('accepts custom bounds and padding', async () => {
    const map = createMockMap();
    const bounds: [[number, number], [number, number]] = [
      [-3.4, 54.3],
      [-2.9, 54.7],
    ];

    await frameBoundary(asMap(map), bounds, 96);

    expect(map.fitBounds).toHaveBeenCalledWith(bounds, {
      animate: false,
      bearing: 0,
      padding: 96,
      pitch: 0,
    });
  });

  it('widens padding per axis for the destination aspect so the cover-crop keeps the park', async () => {
    // 1600×900 viewport, landscape map box aspect 1822/803 (~2.27): the crop
    // keeps a centred 1600×705.2 region, so top/bottom padding must absorb
    // the (900 − 705.2) / 2 ≈ 97.4px the crop trims, plus the 48px base.
    const map = createMockMap({
      canvas: createMockCanvas({ width: 1600, height: 900 }),
    });

    await frameBoundary(asMap(map), LAKE_DISTRICT_BOUNDS, 48, 1822 / 803);

    const options = map.fitBounds.mock.calls[0]?.[1] as {
      padding: { top: number; bottom: number; left: number; right: number };
    };
    expect(options.padding.left).toBe(48);
    expect(options.padding.right).toBe(48);
    expect(options.padding.top).toBeCloseTo(145.42, 1);
    expect(options.padding.bottom).toBeCloseTo(145.42, 1);
  });

  it('computes aspect padding in CSS pixels on DPR 2 displays', async () => {
    const map = createMockMap({
      canvas: createMockCanvas({ width: 3200, height: 1800 }),
      pixelRatio: 2,
    });

    await frameBoundary(asMap(map), LAKE_DISTRICT_BOUNDS, 48, 1822 / 803);

    const options = map.fitBounds.mock.calls[0]?.[1] as {
      padding: { top: number; bottom: number; left: number; right: number };
    };
    // Same CSS-pixel padding as the 1600×900 DPR-1 viewport.
    expect(options.padding.left).toBe(48);
    expect(options.padding.top).toBeCloseTo(145.42, 1);
  });

  it('throws instead of hanging when the bounds cannot fit the canvas', async () => {
    // maplibre's fitBounds silently no-ops when cameraForBounds cannot fit,
    // so no idle would ever fire on an already-idle map.
    const map = createMockMap({ fittable: false });

    await expect(frameBoundary(asMap(map), LAKE_DISTRICT_BOUNDS)).rejects.toThrow(
      'Map viewport is too small to frame the export bounds',
    );

    expect(map.fitBounds).not.toHaveBeenCalled();
    // No idle listener is registered, so none can leak.
    expect(map.once).not.toHaveBeenCalled();
    // The camera never moved, so there is nothing to restore.
    expect(map.jumpTo).not.toHaveBeenCalled();
  });

  it('restore() puts the original viewport back exactly', async () => {
    const map = createMockMap();

    const restore = await frameBoundary(asMap(map), LAKE_DISTRICT_BOUNDS);

    expect(map.jumpTo).not.toHaveBeenCalled();

    restore();

    expect(map.jumpTo).toHaveBeenCalledWith({
      center: { lng: -3.21, lat: 54.61 },
      zoom: 11.4,
      bearing: -12,
      pitch: 38,
    });
  });

  it('reads the viewport before moving the camera', async () => {
    const map = createMockMap();

    await frameBoundary(asMap(map), LAKE_DISTRICT_BOUNDS);

    const fitOrder = map.fitBounds.mock.invocationCallOrder[0] ?? 0;
    for (const getter of [map.getCenter, map.getZoom, map.getBearing, map.getPitch]) {
      expect(getter.mock.invocationCallOrder[0]).toBeLessThan(fitOrder);
    }
  });
});

describe('LAKE_DISTRICT_BOUNDS export frame', () => {
  const [[west, south], [east, north]] = LAKE_DISTRICT_BOUNDS;

  it('contains the whole committed park boundary, so exports never truncate the outline', () => {
    const boundary = JSON.parse(boundaryRaw) as FeatureCollection<Polygon>;
    const vertices = boundary.features.flatMap((feature) =>
      feature.geometry.coordinates.flat(),
    );

    expect(vertices.length).toBeGreaterThan(100);

    const lons = vertices.map(([lon]) => lon ?? Number.NaN);
    const lats = vertices.map(([, lat]) => lat ?? Number.NaN);

    expect(Math.min(...lons)).toBeGreaterThanOrEqual(west);
    expect(Math.max(...lons)).toBeLessThanOrEqual(east);
    expect(Math.min(...lats)).toBeGreaterThanOrEqual(south);
    expect(Math.max(...lats)).toBeLessThanOrEqual(north);
  });

  it('contains every Wainwright summit', () => {
    for (const peak of wainwrights.peaks) {
      expect(peak.lon, `${peak.name} longitude`).toBeGreaterThanOrEqual(west);
      expect(peak.lon, `${peak.name} longitude`).toBeLessThanOrEqual(east);
      expect(peak.lat, `${peak.name} latitude`).toBeGreaterThanOrEqual(south);
      expect(peak.lat, `${peak.name} latitude`).toBeLessThanOrEqual(north);
    }
  });
});
