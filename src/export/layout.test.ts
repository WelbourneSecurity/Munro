import {
  EXPORT_PRESETS,
  EXPORT_WORDMARK,
  attributionLine,
  coverCrop,
  coverCropPadding,
  formatExportDate,
  getExportPreset,
  layoutExport,
  marginFor,
  progressSegments,
  typeScale,
  wrapText,
} from './layout';

const measureByLength = (text: string) => text.length * 10;

describe('export presets', () => {
  it('defines the portrait and landscape share sizes', () => {
    expect(
      EXPORT_PRESETS.map((preset) => [preset.id, preset.width, preset.height]),
    ).toEqual([
      ['portrait', 1600, 2000],
      ['landscape', 1920, 1080],
    ]);
  });

  it('looks up presets by id', () => {
    expect(getExportPreset('portrait').height).toBe(2000);
    expect(getExportPreset('landscape').width).toBe(1920);
  });

  it('rejects unknown preset ids', () => {
    expect(() => getExportPreset('square' as never)).toThrow(RangeError);
  });
});

describe('typeScale and marginFor', () => {
  it('derives sizes from the shorter edge', () => {
    const portrait = typeScale(getExportPreset('portrait'));

    expect(portrait).toEqual({ title: 54, progress: 38, meta: 24, attribution: 19 });
    expect(marginFor(getExportPreset('portrait'))).toBe(72);
  });

  it('clamps attribution size so licences stay legible on landscape', () => {
    const landscape = typeScale(getExportPreset('landscape'));

    expect(landscape.attribution).toBe(16);
    expect(landscape.attribution).toBeGreaterThanOrEqual(16);
    expect(marginFor(getExportPreset('landscape'))).toBe(49);
  });
});

describe('layoutExport', () => {
  it.each(['portrait', 'landscape'] as const)('lays out the %s preset', (id) => {
    const preset = getExportPreset(id);
    const layout = layoutExport(preset, 2);
    const margin = layout.margin;

    // Map fills the width inside the margins and starts at the top margin.
    expect(layout.map.x).toBe(margin);
    expect(layout.map.y).toBe(margin);
    expect(layout.map.width).toBe(preset.width - margin * 2);
    expect(layout.map.height).toBeGreaterThan(preset.height * 0.35);

    // Text stack sits below the map, in order, inside the canvas.
    expect(layout.title.baseline).toBeGreaterThan(layout.map.y + layout.map.height);
    expect(layout.progress.baseline).toBeGreaterThan(layout.title.baseline);
    expect(layout.divider.y).toBeGreaterThan(layout.progress.baseline);
    expect(layout.attribution.firstBaseline).toBeGreaterThan(layout.divider.y);

    // Attribution block is pinned to the bottom margin.
    expect(
      layout.attribution.firstBaseline + (2 - 1) * layout.attribution.lineHeight,
    ).toBe(preset.height - margin);

    // Right-aligned anchors share baselines with the left column.
    expect(layout.wordmark).toEqual({
      x: preset.width - margin,
      baseline: layout.title.baseline,
    });
    expect(layout.date).toEqual({
      x: preset.width - margin,
      baseline: layout.progress.baseline,
    });
    expect(layout.divider).toEqual({
      x: margin,
      y: layout.divider.y,
      width: preset.width - margin * 2,
    });
    expect(layout.attribution.maxWidth).toBe(preset.width - margin * 2);
    expect(layout.attribution.lineCount).toBe(2);
  });

  it('defaults to a single attribution line', () => {
    expect(layoutExport(getExportPreset('portrait')).attribution.lineCount).toBe(1);
  });

  it('gives the map more height when the attribution needs fewer lines', () => {
    const preset = getExportPreset('portrait');

    expect(layoutExport(preset, 1).map.height).toBeGreaterThan(
      layoutExport(preset, 3).map.height,
    );
  });

  it('rejects non-positive or fractional line counts', () => {
    const preset = getExportPreset('portrait');

    expect(() => layoutExport(preset, 0)).toThrow(RangeError);
    expect(() => layoutExport(preset, 1.5)).toThrow(RangeError);
    expect(() => layoutExport(preset, -2)).toThrow(RangeError);
  });

  it('rejects attribution blocks that would crush the map', () => {
    expect(() => layoutExport(getExportPreset('landscape'), 30)).toThrow(RangeError);
  });
});

describe('wrapText', () => {
  it('returns a short text as a single line', () => {
    expect(wrapText('Lake District', 200, measureByLength)).toEqual(['Lake District']);
  });

  it('wraps greedily at word boundaries', () => {
    expect(wrapText('one two three four', 100, measureByLength)).toEqual([
      'one two',
      'three four',
    ]);
  });

  it('handles very long titles across many lines', () => {
    const longTitle =
      'An improbably long export title that keeps going well beyond any margin';
    const lines = wrapText(longTitle, 200, measureByLength);

    expect(lines.length).toBeGreaterThan(2);
    expect(lines.join(' ')).toBe(longTitle);
    for (const line of lines) {
      expect(measureByLength(line)).toBeLessThanOrEqual(200);
    }
  });

  it('gives an overlong single word its own line without breaking it', () => {
    expect(
      wrapText('tiny Blencathra-Hallsfell-Top tiny', 100, measureByLength),
    ).toEqual(['tiny', 'Blencathra-Hallsfell-Top', 'tiny']);
  });

  it('collapses whitespace runs and trims the ends', () => {
    expect(wrapText('  one \n two\t three  ', 1000, measureByLength)).toEqual([
      'one two three',
    ]);
  });

  it('returns no lines for empty or whitespace-only text', () => {
    expect(wrapText('', 100, measureByLength)).toEqual([]);
    expect(wrapText('   ', 100, measureByLength)).toEqual([]);
  });

  it('rejects a non-positive maxWidth', () => {
    expect(() => wrapText('text', 0, measureByLength)).toThrow(RangeError);
    expect(() => wrapText('text', Number.NaN, measureByLength)).toThrow(RangeError);
  });
});

describe('progressSegments', () => {
  it('emphasises only the bagged count', () => {
    expect(progressSegments({ bagged: 37, total: 214 })).toEqual([
      { text: '37', emphasis: true },
      { text: ' / 214 BAGGED', emphasis: false },
    ]);
  });

  it('handles zero bagged', () => {
    expect(progressSegments({ bagged: 0, total: 214 })).toEqual([
      { text: '0', emphasis: true },
      { text: ' / 214 BAGGED', emphasis: false },
    ]);
  });

  it('handles a complete round of 214', () => {
    expect(progressSegments({ bagged: 214, total: 214 })).toEqual([
      { text: '214', emphasis: true },
      { text: ' / 214 BAGGED', emphasis: false },
    ]);
  });

  it('rejects impossible stats', () => {
    expect(() => progressSegments({ bagged: 215, total: 214 })).toThrow(RangeError);
    expect(() => progressSegments({ bagged: -1, total: 214 })).toThrow(RangeError);
    expect(() => progressSegments({ bagged: 1.5, total: 214 })).toThrow(RangeError);
    expect(() => progressSegments({ bagged: 1, total: Number.NaN })).toThrow(
      RangeError,
    );
  });
});

describe('formatExportDate', () => {
  it('formats deterministically without locale involvement', () => {
    expect(formatExportDate(new Date(2026, 6, 10))).toBe('10 July 2026');
    expect(formatExportDate(new Date(2026, 0, 1))).toBe('1 January 2026');
    expect(formatExportDate(new Date(2027, 11, 31))).toBe('31 December 2027');
  });

  it('rejects an invalid date', () => {
    expect(() => formatExportDate(new Date('nonsense'))).toThrow(RangeError);
  });
});

describe('attributionLine', () => {
  it('joins labels with a middle dot separator', () => {
    expect(attributionLine(['Hill data: DoBIH', 'OpenFreeMap © OpenMapTiles'])).toBe(
      'Hill data: DoBIH  ·  OpenFreeMap © OpenMapTiles',
    );
  });

  it('drops empty labels and trims the rest', () => {
    expect(attributionLine([' a ', '', '  ', 'b'])).toBe('a  ·  b');
  });

  it('rejects an empty label list', () => {
    expect(() => attributionLine([])).toThrow(RangeError);
    expect(() => attributionLine(['', '  '])).toThrow(RangeError);
  });
});

describe('coverCrop', () => {
  it('crops the width of a wide source filling a tall box', () => {
    expect(coverCrop(2000, 1000, 500, 500)).toEqual({
      sx: 500,
      sy: 0,
      sWidth: 1000,
      sHeight: 1000,
    });
  });

  it('crops the height of a tall source filling a wide box', () => {
    expect(coverCrop(1000, 2000, 500, 250)).toEqual({
      sx: 0,
      sy: 750,
      sWidth: 1000,
      sHeight: 500,
    });
  });

  it('keeps the full source when aspect ratios match, at any pixel ratio', () => {
    // A DPR-2 snapshot is twice the physical size — same crop, more detail.
    expect(coverCrop(3200, 4000, 1456, 1820)).toEqual({
      sx: 0,
      sy: 0,
      sWidth: 3200,
      sHeight: 4000,
    });
  });

  it('rejects non-positive dimensions', () => {
    expect(() => coverCrop(0, 100, 10, 10)).toThrow(RangeError);
    expect(() => coverCrop(100, 100, -10, 10)).toThrow(RangeError);
    expect(() => coverCrop(100, Number.POSITIVE_INFINITY, 10, 10)).toThrow(RangeError);
  });
});

describe('coverCropPadding', () => {
  it('stays symmetric when the viewport already matches the destination aspect', () => {
    expect(coverCropPadding(1600, 800, 2, 48)).toEqual({
      top: 48,
      bottom: 48,
      left: 48,
      right: 48,
    });
  });

  it('widens top/bottom padding when the destination is wider than the viewport', () => {
    // A 1600×900 viewport cropped to a 2:1 box keeps a centred 1600×800
    // region — the 50px trimmed per side must be absorbed as extra padding.
    expect(coverCropPadding(1600, 900, 2, 48)).toEqual({
      top: 98,
      bottom: 98,
      left: 48,
      right: 48,
    });
  });

  it('widens left/right padding when the destination is taller than the viewport', () => {
    // A 2000×1000 viewport cropped to a 1:1 box keeps a centred 1000×1000
    // region — 500px trimmed per side.
    expect(coverCropPadding(2000, 1000, 1, 32)).toEqual({
      top: 32,
      bottom: 32,
      left: 532,
      right: 532,
    });
  });

  it('scales the base padding down when the crop keeps only a small region', () => {
    // Landscape preset from an iPhone-13-sized map canvas (390×788 CSS px):
    // the cover-crop keeps only a 390×~172 strip, where a fixed 48px per
    // side would leave the fitted bounds under half the export's map box.
    const aspect = 1822 / 803;
    const keptHeight = 390 / aspect;
    const scaledBase = keptHeight * 0.08;
    const padding = coverCropPadding(390, 788, aspect, 48);

    expect(scaledBase).toBeLessThan(48);
    expect(padding.left).toBeCloseTo(scaledBase, 5);
    expect(padding.right).toBeCloseTo(scaledBase, 5);
    expect(padding.top).toBeCloseTo((788 - keptHeight) / 2 + scaledBase, 5);
    expect(padding.bottom).toBeCloseTo((788 - keptHeight) / 2 + scaledBase, 5);
    // The fitted bounds keep the bulk of the crop-surviving region.
    expect(keptHeight - scaledBase * 2).toBeGreaterThan(keptHeight * 0.8);
  });

  it('keeps the full base padding when the kept region is large (desktop)', () => {
    // A 1600×900 desktop viewport keeps a 1600×~705 region at the landscape
    // aspect — 48px per side is well under the proportional cap there.
    const padding = coverCropPadding(1600, 900, 1822 / 803, 48);

    expect(padding.left).toBe(48);
    expect(padding.right).toBe(48);
  });

  it('composes with coverCrop so the padded fit survives the crop', () => {
    // Contain-fitting with this padding, then cover-cropping the same
    // viewport to the destination aspect, must keep the fitted content: the
    // crop's kept region has to contain the inner (padded) box.
    const [width, height, aspect, base] = [390, 700, 1822 / 803, 48];
    const padding = coverCropPadding(width, height, aspect, base);
    const crop = coverCrop(width, height, 1822, 803);

    expect(crop.sx).toBeLessThanOrEqual(padding.left);
    expect(crop.sy).toBeLessThanOrEqual(padding.top);
    expect(crop.sx + crop.sWidth).toBeGreaterThanOrEqual(width - padding.right);
    expect(crop.sy + crop.sHeight).toBeGreaterThanOrEqual(height - padding.bottom);
  });

  it('rejects non-positive dimensions and negative base padding', () => {
    expect(() => coverCropPadding(0, 100, 1, 0)).toThrow(RangeError);
    expect(() => coverCropPadding(100, 100, -1, 0)).toThrow(RangeError);
    expect(() => coverCropPadding(100, 100, 1, -1)).toThrow(RangeError);
    expect(() => coverCropPadding(100, Number.POSITIVE_INFINITY, 1, 0)).toThrow(
      RangeError,
    );
  });
});

describe('export copy constants', () => {
  it('matches the product copy', () => {
    expect(EXPORT_WORDMARK).toBe('MUNRO / FIELD EDITION');
  });
});
