// Pure layout arithmetic for the export image. No DOM, no canvas access —
// everything here is deterministic and unit-testable in the node environment.
// compose.ts turns these boxes and baselines into pixels.

export type ExportPresetId = 'portrait' | 'landscape';

export interface ExportPreset {
  id: ExportPresetId;
  label: string;
  width: number;
  height: number;
}

/** Output sizes for sharing: portrait 1600×2000, landscape 1920×1080. */
export const EXPORT_PRESETS: readonly ExportPreset[] = [
  { id: 'portrait', label: 'Portrait 1600 × 2000', width: 1600, height: 2000 },
  { id: 'landscape', label: 'Landscape 1920 × 1080', width: 1920, height: 1080 },
];

export function getExportPreset(id: ExportPresetId): ExportPreset {
  const preset = EXPORT_PRESETS.find((candidate) => candidate.id === id);

  if (!preset) {
    throw new RangeError(`Unknown export preset: ${id}`);
  }

  return preset;
}

export interface ExportTypeScale {
  /** Title ("Lake District · Wainwrights"). */
  title: number;
  /** Progress line ("37 / 214 bagged"). */
  progress: number;
  /** Wordmark and export date. */
  meta: number;
  /** Attribution lines — clamped so licences stay legible at every preset. */
  attribution: number;
}

const MIN_ATTRIBUTION_PX = 16;

/** Type scale in pixels, derived from the preset's shorter edge. */
export function typeScale(preset: ExportPreset): ExportTypeScale {
  const unit = Math.min(preset.width, preset.height) / 100;

  return {
    title: Math.round(unit * 3.4),
    progress: Math.round(unit * 2.4),
    meta: Math.round(unit * 1.5),
    attribution: Math.max(MIN_ATTRIBUTION_PX, Math.round(unit * 1.2)),
  };
}

/** Outer margin in pixels, derived from the preset's shorter edge. */
export function marginFor(preset: ExportPreset): number {
  return Math.round(Math.min(preset.width, preset.height) * 0.045);
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A text anchor: x plus the alphabetic baseline y to draw at. */
export interface TextAnchor {
  x: number;
  baseline: number;
}

export interface ExportLayout {
  preset: ExportPreset;
  margin: number;
  scale: ExportTypeScale;
  /** Where the map snapshot is drawn. */
  map: Box;
  /** Left-aligned title anchor. */
  title: TextAnchor;
  /** Left-aligned progress-line anchor. */
  progress: TextAnchor;
  /** Right-aligned wordmark anchor (x is the right edge). */
  wordmark: TextAnchor;
  /** Right-aligned export-date anchor (x is the right edge). */
  date: TextAnchor;
  /** Thin rule between the stats block and the attribution block. */
  divider: { x: number; y: number; width: number };
  attribution: {
    x: number;
    firstBaseline: number;
    lineHeight: number;
    maxWidth: number;
    lineCount: number;
  };
}

/**
 * Lay out the export: map on top, then title/progress (left) with
 * wordmark/date (right), a thin divider, and the attribution lines pinned to
 * the bottom margin. The map absorbs whatever height the text does not need.
 */
export function layoutExport(
  preset: ExportPreset,
  attributionLineCount = 1,
): ExportLayout {
  if (!Number.isInteger(attributionLineCount) || attributionLineCount < 1) {
    throw new RangeError('attributionLineCount must be a positive integer');
  }

  const margin = marginFor(preset);
  const scale = typeScale(preset);
  const contentWidth = preset.width - margin * 2;
  const gap = Math.round(scale.progress * 0.8);
  const attributionLineHeight = Math.round(scale.attribution * 1.5);

  const lastAttributionBaseline = preset.height - margin;
  const firstAttributionBaseline =
    lastAttributionBaseline - (attributionLineCount - 1) * attributionLineHeight;
  const dividerY =
    firstAttributionBaseline - scale.attribution - Math.round(gap * 0.75);
  const progressBaseline = dividerY - gap;
  const titleBaseline = progressBaseline - Math.round(scale.progress * 1.7);
  const mapBottom = titleBaseline - scale.title - gap;
  const mapHeight = mapBottom - margin;

  if (mapHeight < preset.height * 0.35) {
    throw new RangeError(
      'attributionLineCount leaves too little room for the map at this preset',
    );
  }

  return {
    preset,
    margin,
    scale,
    map: { x: margin, y: margin, width: contentWidth, height: mapHeight },
    title: { x: margin, baseline: titleBaseline },
    progress: { x: margin, baseline: progressBaseline },
    wordmark: { x: preset.width - margin, baseline: titleBaseline },
    date: { x: preset.width - margin, baseline: progressBaseline },
    divider: { x: margin, y: dividerY, width: contentWidth },
    attribution: {
      x: margin,
      firstBaseline: firstAttributionBaseline,
      lineHeight: attributionLineHeight,
      maxWidth: contentWidth,
      lineCount: attributionLineCount,
    },
  };
}

/** Measures rendered text width in pixels (e.g. canvas measureText). */
export type MeasureText = (text: string) => number;

/**
 * Greedy word wrap. Whitespace runs collapse to single spaces; a single word
 * wider than maxWidth gets its own line rather than being broken mid-word.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: MeasureText,
): string[] {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    throw new RangeError('maxWidth must be a positive number');
  }

  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;

    if (current !== '' && measure(candidate) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current !== '') {
    lines.push(current);
  }

  return lines;
}

export interface TextSegment {
  text: string;
  /** True for the bagged count — the only place the green accent is allowed. */
  emphasis: boolean;
}

/** Split "N / total bagged" so only the bagged count carries the accent. */
export function progressSegments(stats: {
  bagged: number;
  total: number;
}): TextSegment[] {
  if (!Number.isInteger(stats.bagged) || !Number.isInteger(stats.total)) {
    throw new RangeError('bagged and total must be integers');
  }

  if (stats.bagged < 0 || stats.total < 0 || stats.bagged > stats.total) {
    throw new RangeError('bagged must be between 0 and total');
  }

  return [
    { text: String(stats.bagged), emphasis: true },
    { text: ` / ${String(stats.total)} bagged`, emphasis: false },
  ];
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Deterministic "10 July 2026" date line — no locale involvement. */
export function formatExportDate(date: Date): string {
  const month = MONTHS[date.getMonth()];

  if (!month) {
    throw new RangeError('formatExportDate needs a valid date');
  }

  return `${String(date.getDate())} ${month} ${String(date.getFullYear())}`;
}

/** Join attribution labels into the single line drawn into the image. */
export function attributionLine(labels: readonly string[]): string {
  const cleaned = labels
    .map((label) => label.trim())
    .filter((label) => label.length > 0);

  if (cleaned.length === 0) {
    throw new RangeError('attributionLine needs at least one label');
  }

  return cleaned.join('  ·  ');
}

export interface CropRegion {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
}

/**
 * Centre-crop a source image to cover a destination box (like CSS
 * object-fit: cover). Source dimensions are physical pixels, so DPR ≥ 2
 * snapshots keep their full sharpness — they are downscaled, never stretched.
 */
export function coverCrop(
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): CropRegion {
  for (const value of [srcWidth, srcHeight, dstWidth, dstHeight]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError('coverCrop dimensions must be positive numbers');
    }
  }

  const scale = Math.max(dstWidth / srcWidth, dstHeight / srcHeight);
  const sWidth = dstWidth / scale;
  const sHeight = dstHeight / scale;

  return {
    sx: (srcWidth - sWidth) / 2,
    sy: (srcHeight - sHeight) / 2,
    sWidth,
    sHeight,
  };
}

/** Per-side padding in pixels, in the shape maplibre's fitBounds accepts. */
export interface FramePadding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Padding that makes a contain-fit survive a later centre cover-crop.
 *
 * fitBounds contain-fits content to the viewport's aspect, but composeExport
 * centre-crops the snapshot to the export preset's map-box aspect
 * (`dstAspect` = width / height) — a plain symmetric padding would let that
 * crop cut off fitted content whenever the two aspects differ. This widens
 * the padding on the axis the crop trims, so the fitted content sits inside
 * the surviving centre region with `basePadding` still around it. Units
 * follow the viewport (CSS pixels for a live map).
 */
export function coverCropPadding(
  viewportWidth: number,
  viewportHeight: number,
  dstAspect: number,
  basePadding = 0,
): FramePadding {
  for (const value of [viewportWidth, viewportHeight, dstAspect]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError('coverCropPadding dimensions must be positive numbers');
    }
  }

  if (!Number.isFinite(basePadding) || basePadding < 0) {
    throw new RangeError('coverCropPadding basePadding must be a non-negative number');
  }

  // The centred region coverCrop keeps, in viewport units.
  const keptWidth = Math.min(viewportWidth, viewportHeight * dstAspect);
  const keptHeight = Math.min(viewportHeight, viewportWidth / dstAspect);
  const x = (viewportWidth - keptWidth) / 2 + basePadding;
  const y = (viewportHeight - keptHeight) / 2 + basePadding;

  return { top: y, bottom: y, left: x, right: x };
}

/** The fixed export title for the MVP's single list. */
export const EXPORT_TITLE = 'Lake District · Wainwrights';

/** The small, restrained Munro wordmark. */
export const EXPORT_WORDMARK = 'MUNRO';
