import { ATTRIBUTIONS } from '../data/attribution';
import { composeExport } from './compose';
import {
  EXPORT_WORDMARK,
  getExportPreset,
  layoutExport,
  marginFor,
  typeScale,
} from './layout';
import type { MapSnapshot } from './snapshot';

interface RecordedOp {
  op: string;
  args: unknown[];
  fillStyle: string;
  strokeStyle: string;
  font: string;
  textAlign: string;
}

const CHAR_WIDTH = 10;

class FakeContext {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 0;
  font = '';
  textAlign = 'left';
  textBaseline = 'alphabetic';
  ops: RecordedOp[] = [];

  private record(op: string, args: unknown[]) {
    this.ops.push({
      op,
      args,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      font: this.font,
      textAlign: this.textAlign,
    });
  }

  fillRect(...args: number[]) {
    this.record('fillRect', args);
  }

  strokeRect(...args: number[]) {
    this.record('strokeRect', args);
  }

  fillText(text: string, x: number, y: number) {
    this.record('fillText', [text, x, y]);
  }

  drawImage(...args: unknown[]) {
    this.record('drawImage', args);
  }

  measureText(text: string) {
    return { width: text.length * CHAR_WIDTH };
  }
}

class FakeOffscreenCanvas {
  static instances: FakeOffscreenCanvas[] = [];
  context = new FakeContext();
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    FakeOffscreenCanvas.instances.push(this);
  }

  getContext(kind: string) {
    expect(kind).toBe('2d');
    return this.context;
  }

  convertToBlob(options: { type: string }) {
    return Promise.resolve(new Blob(['offscreen-png'], { type: options.type }));
  }
}

class FakeDocumentCanvas {
  static instances: FakeDocumentCanvas[] = [];
  width = 0;
  height = 0;
  context = new FakeContext();

  getContext(kind: string) {
    expect(kind).toBe('2d');
    return this.context;
  }

  toBlob(callback: (blob: Blob | null) => void, type: string) {
    callback(new Blob(['document-png'], { type }));
  }
}

function makeSnapshot(overrides: Partial<MapSnapshot> = {}): MapSnapshot {
  return {
    blob: new Blob(['snapshot'], { type: 'image/png' }),
    bitmap: { close: vi.fn() } as unknown as ImageBitmap,
    width: 3200,
    height: 4000,
    pixelRatio: 2,
    ...overrides,
  };
}

function textOps(context: FakeContext) {
  return context.ops.filter((op) => op.op === 'fillText');
}

function findText(context: FakeContext, text: string) {
  return textOps(context).find((op) => op.args[0] === text);
}

beforeEach(() => {
  FakeOffscreenCanvas.instances = [];
  FakeDocumentCanvas.instances = [];
  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('composeExport', () => {
  const stats = { bagged: 37, total: 214 };
  const options = {
    preset: 'portrait',
    title: 'Lake District · Wainwrights',
    date: new Date(2026, 6, 10),
  } as const;

  async function composeOnFakeCanvas(
    snapshot = makeSnapshot(),
    composeStats = stats,
    composeOptions: Parameters<typeof composeExport>[2] = options,
  ) {
    const blob = await composeExport(snapshot, composeStats, composeOptions);
    const canvas = FakeOffscreenCanvas.instances[0];

    if (!canvas) {
      throw new Error('composeExport did not create an OffscreenCanvas');
    }

    return { blob, canvas, context: canvas.context };
  }

  it('returns a PNG blob sized to the chosen preset', async () => {
    const { blob, canvas } = await composeOnFakeCanvas();

    expect(blob.type).toBe('image/png');
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(2000);
  });

  it('selects the landscape preset dimensions', async () => {
    const { canvas } = await composeOnFakeCanvas(makeSnapshot(), stats, {
      preset: 'landscape',
      title: 'Lake District · Wainwrights',
      date: new Date(2026, 6, 10),
    });

    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
  });

  it('paints the warm bone poster stock first', async () => {
    const { context } = await composeOnFakeCanvas();
    const [ground] = context.ops;

    expect(ground).toMatchObject({
      op: 'fillRect',
      args: [0, 0, 1600, 2000],
      fillStyle: '#f2efe7',
    });
  });

  it('draws the snapshot cover-cropped into the layout map box', async () => {
    const { context } = await composeOnFakeCanvas();
    const draw = context.ops.find((op) => op.op === 'drawImage');
    const preset = getExportPreset('portrait');
    const margin = marginFor(preset);

    expect(draw).toBeDefined();
    const [, sx, sy, sWidth, sHeight, dx, dy, dWidth] = draw?.args ?? [];

    // Destination is the layout's map box.
    expect(dx).toBe(margin);
    expect(dy).toBe(margin);
    expect(dWidth).toBe(preset.width - margin * 2);

    // Source crop stays inside the DPR-2 snapshot's physical pixels.
    expect(sx).toBeGreaterThanOrEqual(0);
    expect(sy).toBeGreaterThanOrEqual(0);
    expect(sWidth).toBeLessThanOrEqual(3200);
    expect(sHeight).toBeLessThanOrEqual(4000);
  });

  it('draws the given edition title in ink', async () => {
    const { context } = await composeOnFakeCanvas(makeSnapshot(), stats, {
      ...options,
      title: 'Scottish Highlands · Munros',
    });
    const title = findText(context, 'Scottish Highlands · Munros');

    expect(title).toMatchObject({ fillStyle: '#11110f', textAlign: 'left' });
  });

  it('shrinks an overlong title to fit beside the wordmark', async () => {
    const preset = getExportPreset('portrait');
    const margin = marginFor(preset);
    const scale = typeScale(preset);
    const longTitle = `England, Wales & Northern Ireland · ${'Hewitts '.repeat(15).trim()}`;
    const { context } = await composeOnFakeCanvas(makeSnapshot(), stats, {
      ...options,
      title: longTitle,
    });
    const title = findText(context, longTitle);

    // The space left of the right-aligned wordmark, minus a title-em gap.
    const maxWidth =
      preset.width - margin * 2 - EXPORT_WORDMARK.length * CHAR_WIDTH - scale.title;
    const expectedSize = Math.floor(
      (scale.title * maxWidth) / (longTitle.length * CHAR_WIDTH),
    );

    expect(expectedSize).toBeLessThan(scale.title);
    expect(title?.font).toContain(`${String(expectedSize)}px`);
  });

  it('uses ink and graphite for progress without a colour-only status accent', async () => {
    const { context } = await composeOnFakeCanvas();
    const count = findText(context, '37');
    const rest = findText(context, ' / 214 BAGGED');

    expect(count).toMatchObject({ fillStyle: '#11110f' });
    expect(rest).toMatchObject({ fillStyle: '#34342f' });

    // The remainder starts where the ink count ends.
    expect(rest?.args[1]).toBe(Number(count?.args[1]) + '37'.length * CHAR_WIDTH);
  });

  it('draws the wordmark and export date right-aligned in muted grey', async () => {
    const { context } = await composeOnFakeCanvas();
    const wordmark = findText(context, EXPORT_WORDMARK);
    const date = findText(context, '10 July 2026');

    expect(wordmark).toMatchObject({ fillStyle: '#77746b', textAlign: 'right' });
    expect(date).toMatchObject({ fillStyle: '#77746b', textAlign: 'right' });
  });

  it('draws the map border and divider in the --color-line token colour', async () => {
    // compose.ts duplicates the @theme hex values because a 2D canvas cannot
    // read CSS custom properties; #c8c1b3 is --color-hairline in src/index.css.
    const { context } = await composeOnFakeCanvas();
    const border = context.ops.find((op) => op.op === 'strokeRect');
    const divider = context.ops.find((op) => op.op === 'fillRect' && op.args[3] === 1);

    expect(border?.strokeStyle).toBe('#c8c1b3');
    expect(divider?.fillStyle).toBe('#c8c1b3');
  });

  it('draws every attribution constant into the pixels', async () => {
    const { context } = await composeOnFakeCanvas();
    const drawnText = textOps(context)
      .map((op) => String(op.args[0]))
      .join(' ');

    for (const attribution of ATTRIBUTIONS) {
      // Wrapping may split a label across lines; every word must survive.
      for (const word of attribution.label.split(/\s+/)) {
        expect(drawnText).toContain(word);
      }
    }
  });

  it('lays the attribution lines out on the layout baselines', async () => {
    const { context } = await composeOnFakeCanvas();
    const preset = getExportPreset('portrait');
    // Attribution lines are the only left-aligned muted-grey text.
    const attributionOps = textOps(context).filter(
      (op) => op.textAlign === 'left' && op.fillStyle === '#77746b',
    );
    const lineCount = attributionOps.length;
    const layout = layoutExport(preset, lineCount);

    expect(lineCount).toBeGreaterThanOrEqual(1);
    attributionOps.forEach((op, index) => {
      expect(op.args[1]).toBe(layout.attribution.x);
      expect(op.args[2]).toBe(
        layout.attribution.firstBaseline + index * layout.attribution.lineHeight,
      );
    });
  });

  it('closes the captured bitmap once it has been drawn', async () => {
    const close = vi.fn();
    const snapshot = makeSnapshot({ bitmap: { close } as unknown as ImageBitmap });

    await composeOnFakeCanvas(snapshot);

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('decodes the blob and closes the bitmap when the snapshot has no bitmap', async () => {
    const close = vi.fn();
    const createImageBitmap = vi.fn(() => Promise.resolve({ close }));
    vi.stubGlobal('createImageBitmap', createImageBitmap);
    const snapshot = makeSnapshot();
    delete (snapshot as { bitmap?: ImageBitmap }).bitmap;

    await composeOnFakeCanvas(snapshot);

    expect(createImageBitmap).toHaveBeenCalledWith(snapshot.blob);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('rejects when no bitmap exists and createImageBitmap is unavailable', async () => {
    const snapshot = makeSnapshot();
    delete (snapshot as { bitmap?: ImageBitmap }).bitmap;

    await expect(composeExport(snapshot, stats, options)).rejects.toThrow(
      'createImageBitmap is required to decode the map snapshot',
    );
  });

  it('falls back to a document canvas when OffscreenCanvas is missing', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        expect(tag).toBe('canvas');
        const canvas = new FakeDocumentCanvas();
        FakeDocumentCanvas.instances.push(canvas);
        return canvas;
      }),
    });

    const blob = await composeExport(makeSnapshot(), stats, options);
    const canvas = FakeDocumentCanvas.instances[0];

    expect(blob.type).toBe('image/png');
    expect(canvas?.width).toBe(1600);
    expect(canvas?.height).toBe(2000);
    expect(canvas?.context.ops.length).toBeGreaterThan(0);
  });

  it('rejects when neither OffscreenCanvas nor document exists', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined);

    await expect(composeExport(makeSnapshot(), stats, options)).rejects.toThrow(
      'No canvas implementation available for export composition',
    );
  });

  it('rejects an empty snapshot', async () => {
    await expect(
      composeExport(makeSnapshot({ width: 0, height: 0 }), stats, options),
    ).rejects.toThrow(RangeError);
  });

  it('rejects impossible stats before touching the canvas', async () => {
    await expect(
      composeExport(makeSnapshot(), { bagged: 300, total: 214 }, options),
    ).rejects.toThrow(RangeError);
    expect(FakeOffscreenCanvas.instances).toHaveLength(0);
  });
});
