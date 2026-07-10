// Map snapshot capture for the export feature.
//
// maplibre-gl appears here with `import type` ONLY. Type imports are erased
// at compile time, so this module adds no maplibre runtime dependency and the
// repo rule that src/map/MapView is the only module touching maplibre-gl at
// runtime stays intact.
import type { LngLatBoundsLike, Map as MapLibreMap } from 'maplibre-gl';

import { LAKE_DISTRICT_BOUNDS } from '../map/config';
import { coverCropPadding } from './layout';

// Runtime capability probe: createImageBitmap is typed as always present in
// the DOM lib, but node (unit tests) and older browsers lack it.
const runtime = globalThis as {
  createImageBitmap?: typeof createImageBitmap;
};

export interface MapSnapshot {
  /** PNG-encoded snapshot of the WebGL canvas. */
  blob: Blob;
  /** Decoded bitmap, when the environment supports createImageBitmap. */
  bitmap?: ImageBitmap;
  /** Physical pixel width — already multiplied by the device pixel ratio. */
  width: number;
  /** Physical pixel height — already multiplied by the device pixel ratio. */
  height: number;
  /** The map's device pixel ratio at capture time (2+ on hi-dpi screens). */
  pixelRatio: number;
}

/**
 * Resolve once the map is idle: immediately when the camera is at rest and
 * the map reports loaded() (style and tiles settled), otherwise on the next
 * idle event. loaded() alone is not enough — maplibre reports loaded()
 * between the frames of a camera animation, so checking only it would
 * capture a mid-flight frame during flyTo/easeTo or drag inertia. The idle
 * event itself fires when !isMoving() && loaded(), so both are checked here.
 */
export function waitForMapIdle(map: MapLibreMap): Promise<void> {
  if (!map.isMoving() && map.loaded()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    // void: maplibre types once() as also returning a promise; the
    // listener-style call used here returns the map itself.
    void map.once('idle', () => {
      resolve();
    });
  });
}

/**
 * Capture the map's WebGL canvas as a PNG snapshot. Relies on the map being
 * created with preserveDrawingBuffer: true (MapView sets it via
 * canvasContextAttributes) and waits for idle so tiles are fully drawn.
 *
 * Width/height are the canvas's physical pixels, so DPR ≥ 2 displays produce
 * a correspondingly larger snapshot — compose downscales it, keeping the
 * export sharp instead of blurry.
 */
export async function captureMap(map: MapLibreMap): Promise<MapSnapshot> {
  await waitForMapIdle(map);

  const canvas = map.getCanvas();

  if (canvas.width <= 0 || canvas.height <= 0) {
    throw new Error('Map canvas has no pixels to capture');
  }

  const blob = await canvasToPngBlob(canvas);
  const bitmap = runtime.createImageBitmap
    ? await runtime.createImageBitmap(canvas)
    : undefined;

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    pixelRatio: map.getPixelRatio(),
    ...(bitmap ? { bitmap } : {}),
  };
}

/**
 * Temporarily frame the Lake District for a consistent export regardless of
 * the user's current viewport: fit the boundary bounds north-up and flat,
 * wait for the map to finish rendering the new view, and return a restore()
 * that puts the user's center/zoom/bearing/pitch back exactly.
 *
 * When `aspect` is given (the destination map box's width / height —
 * composeExport centre-crops the snapshot to it via coverCrop), the fit
 * padding is widened per axis so the crop trims only padding, never the
 * fitted bounds, whatever the viewport's own aspect is.
 */
export async function frameBoundary(
  map: MapLibreMap,
  bounds: LngLatBoundsLike = LAKE_DISTRICT_BOUNDS,
  padding = 48,
  aspect?: number,
): Promise<() => void> {
  const center = map.getCenter();
  const zoom = map.getZoom();
  const bearing = map.getBearing();
  const pitch = map.getPitch();

  const fitPadding =
    aspect === undefined ? padding : cropSafePadding(map, aspect, padding);

  // fitBounds silently no-ops (console warning only) when the bounds plus
  // padding cannot fit the canvas, and a no-op triggers no repaint — on an
  // already-idle map the idle event awaited below would then never fire.
  // Detect that upfront with the same computation fitBounds uses and fail
  // loudly instead of hanging.
  if (!map.cameraForBounds(bounds, { bearing: 0, padding: fitPadding })) {
    throw new Error('Map viewport is too small to frame the export bounds');
  }

  // Listen before moving the camera so the idle after the jump is never
  // missed, then jump without animation for a deterministic frame.
  const idle = new Promise<void>((resolve) => {
    // void: see waitForMapIdle — the listener-style once() is not a promise.
    void map.once('idle', () => {
      resolve();
    });
  });

  map.fitBounds(bounds, {
    animate: false,
    bearing: 0,
    padding: fitPadding,
    pitch: 0,
  });
  await idle;

  return () => {
    map.jumpTo({ center, zoom, bearing, pitch });
  };
}

/**
 * coverCropPadding for the live viewport: the map canvas's CSS-pixel size
 * (fitBounds padding is in CSS pixels; the crop maths are DPR-invariant).
 */
function cropSafePadding(map: MapLibreMap, aspect: number, basePadding: number) {
  const canvas = map.getCanvas();
  const pixelRatio = map.getPixelRatio();

  return coverCropPadding(
    canvas.width / pixelRatio,
    canvas.height / pixelRatio,
    aspect,
    basePadding,
  );
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Map canvas produced an empty snapshot'));
      }
    }, 'image/png');
  });
}
