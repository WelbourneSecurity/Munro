// Export image composition: draws the map snapshot plus title, progress,
// date, wordmark and the licence-required attribution line onto an offscreen
// 2D canvas and returns a PNG blob. All positioning maths lives in layout.ts.
import { ATTRIBUTIONS } from '../data/attribution';
import {
  EXPORT_WORDMARK,
  attributionLine,
  coverCrop,
  formatExportDate,
  getExportPreset,
  layoutExport,
  marginFor,
  progressSegments,
  typeScale,
  wrapText,
} from './layout';
import type { ExportPresetId } from './layout';
import type { MapSnapshot } from './snapshot';

// Colour constants mirror the @theme design tokens in src/index.css. A 2D
// canvas cannot read CSS custom properties without a live DOM element, so the
// hex values are duplicated here — keep them in sync with src/index.css.
const COLOR_SURFACE = '#111713'; // --color-surface
const COLOR_LINE = '#5b7666'; // --color-line
const COLOR_PRIMARY = '#f1f4ee'; // --color-primary
const COLOR_SECONDARY = '#c8d0c6'; // --color-secondary
const COLOR_MUTED = '#96a095'; // --color-muted
const COLOR_BAGGED = '#a7d8b6'; // --color-bagged — bagged count only

// Font stacks mirror --font-sans and --font-label in src/index.css.
const FONT_SANS =
  "'Aptos', 'Aptos Display', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const FONT_LABEL = "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace";

export interface ComposeStats {
  bagged: number;
  total: number;
}

export interface ComposeOptions {
  preset: ExportPresetId;
  /** Title for the active list, e.g. "Lake District · Wainwrights". */
  title: string;
  /** Export date shown on the image; defaults to now. */
  date?: Date;
}

type ExportContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

// Runtime capability probe: these globals are typed as always present in the
// DOM lib but are missing in node (unit tests) and OffscreenCanvas is missing
// in some older browsers.
const runtime = globalThis as {
  OffscreenCanvas?: typeof OffscreenCanvas;
  createImageBitmap?: typeof createImageBitmap;
  document?: Document;
};

/**
 * Compose the shareable export image. The attribution line is drawn into the
 * pixels deliberately: canvas capture excludes the DOM attribution control,
 * and the DoBIH (CC BY 4.0), OpenFreeMap/OpenStreetMap, OGL boundary and
 * terrain credits are licence obligations on the produced image.
 *
 * Consumes the snapshot: its bitmap (captured or decoded here) is closed as
 * soon as it has been drawn, so a snapshot cannot be composed twice.
 */
export async function composeExport(
  snapshot: MapSnapshot,
  stats: ComposeStats,
  options: ComposeOptions,
): Promise<Blob> {
  if (snapshot.width <= 0 || snapshot.height <= 0) {
    throw new RangeError('composeExport needs a snapshot with positive dimensions');
  }

  const segments = progressSegments(stats);
  const preset = getExportPreset(options.preset);
  const { canvas, context } = createExportCanvas(preset.width, preset.height);

  // Wrap the attribution first — its line count decides the map's height.
  const scale = typeScale(preset);
  const margin = marginFor(preset);
  const attributionText = attributionLine(
    ATTRIBUTIONS.map((attribution) => attribution.label),
  );
  context.font = labelFont(scale.attribution);
  const attributionLines = wrapText(
    attributionText,
    preset.width - margin * 2,
    (text) => context.measureText(text).width,
  );
  const layout = layoutExport(preset, attributionLines.length);

  // Dark charcoal ground.
  context.fillStyle = COLOR_SURFACE;
  context.fillRect(0, 0, preset.width, preset.height);

  // Map snapshot, centre-cropped to cover the map box, plus a thin border.
  const image = snapshot.bitmap ?? (await decodeSnapshot(snapshot));
  const crop = coverCrop(
    snapshot.width,
    snapshot.height,
    layout.map.width,
    layout.map.height,
  );
  context.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sWidth,
    crop.sHeight,
    layout.map.x,
    layout.map.y,
    layout.map.width,
    layout.map.height,
  );

  // Close the bitmap unconditionally — captured ones too, not only the one
  // decoded above. A captured bitmap is a full-canvas physical-pixel
  // allocation (tens of MB at DPR 2+) that GC reclaims lazily; a few preset
  // toggles would otherwise strand several of them at once.
  image.close();

  context.strokeStyle = COLOR_LINE;
  context.lineWidth = 1;
  context.strokeRect(layout.map.x, layout.map.y, layout.map.width, layout.map.height);

  context.textBaseline = 'alphabetic';

  // Title — the active list's "Region · Name". Long titles ("England, Wales
  // & Northern Ireland · Hewitts") shrink to fit the space left of the
  // wordmark instead of colliding with it.
  context.textAlign = 'left';
  context.font = `650 ${String(layout.scale.meta)}px ${FONT_LABEL}`;
  const titleMaxWidth =
    layout.wordmark.x -
    context.measureText(EXPORT_WORDMARK).width -
    layout.scale.title -
    layout.title.x;
  context.font = titleFont(
    fitTitleSize(context, options.title, layout.scale.title, titleMaxWidth),
  );
  context.fillStyle = COLOR_PRIMARY;
  context.fillText(options.title, layout.title.x, layout.title.baseline);

  // Progress line — the soft green accent marks the bagged count only.
  context.font = `500 ${String(layout.scale.progress)}px ${FONT_SANS}`;
  let segmentX = layout.progress.x;

  for (const segment of segments) {
    context.fillStyle = segment.emphasis ? COLOR_BAGGED : COLOR_SECONDARY;
    context.fillText(segment.text, segmentX, layout.progress.baseline);
    segmentX += context.measureText(segment.text).width;
  }

  // Wordmark and export date, right-aligned in muted grey.
  context.textAlign = 'right';
  context.font = `650 ${String(layout.scale.meta)}px ${FONT_LABEL}`;
  context.fillStyle = COLOR_MUTED;
  context.fillText(EXPORT_WORDMARK, layout.wordmark.x, layout.wordmark.baseline);
  context.fillText(
    formatExportDate(options.date ?? new Date()),
    layout.date.x,
    layout.date.baseline,
  );

  // Thin divider above the attribution block.
  context.fillStyle = COLOR_LINE;
  context.fillRect(layout.divider.x, layout.divider.y, layout.divider.width, 1);

  // Attribution, drawn into the pixels (licence obligation).
  context.textAlign = 'left';
  context.font = labelFont(layout.scale.attribution);
  context.fillStyle = COLOR_MUTED;
  attributionLines.forEach((line, index) => {
    context.fillText(
      line,
      layout.attribution.x,
      layout.attribution.firstBaseline + index * layout.attribution.lineHeight,
    );
  });

  return toPngBlob(canvas);
}

function labelFont(sizePx: number): string {
  return `400 ${String(sizePx)}px ${FONT_LABEL}`;
}

function titleFont(sizePx: number): string {
  return `600 ${String(sizePx)}px ${FONT_SANS}`;
}

/**
 * Largest font size ≤ baseSize at which `text` fits within `maxWidth`.
 * Canvas text width scales linearly with font size, so one measurement at
 * the base size gives the exact scale factor.
 */
function fitTitleSize(
  context: ExportContext,
  text: string,
  baseSize: number,
  maxWidth: number,
): number {
  context.font = titleFont(baseSize);
  const width = context.measureText(text).width;

  if (width <= maxWidth) {
    return baseSize;
  }

  return Math.max(1, Math.floor((baseSize * maxWidth) / width));
}

interface ExportCanvas {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  context: ExportContext;
}

function createExportCanvas(width: number, height: number): ExportCanvas {
  if (runtime.OffscreenCanvas) {
    const canvas = new runtime.OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not create an OffscreenCanvas 2D context');
    }

    return { canvas, context };
  }

  // Fallback for browsers without OffscreenCanvas: an unattached document
  // canvas behaves identically for drawing and PNG encoding.
  if (!runtime.document) {
    throw new Error('No canvas implementation available for export composition');
  }

  const canvas = runtime.document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create a canvas 2D context');
  }

  return { canvas, context };
}

function decodeSnapshot(snapshot: MapSnapshot): Promise<ImageBitmap> {
  if (!runtime.createImageBitmap) {
    throw new Error('createImageBitmap is required to decode the map snapshot');
  }

  return runtime.createImageBitmap(snapshot.blob);
}

function toPngBlob(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: 'image/png' });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Export canvas produced an empty image'));
      }
    }, 'image/png');
  });
}
