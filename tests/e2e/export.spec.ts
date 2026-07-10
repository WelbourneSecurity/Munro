import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// The export capture path (T5.1/T5.2) cannot be tested in jsdom: reading the
// WebGL canvas back yields real pixels only in a browser, and only when the
// map was created with preserveDrawingBuffer (MapView sets it via
// canvasContextAttributes). These specs exercise the same read path as
// captureMap — map canvas → PNG blob via toBlob, plus a pixel sample — so a
// regression that loses preserveDrawingBuffer or captures before rendering
// turns the sample blank and fails the variance assertions.

interface CanvasCapture {
  /** Physical pixel size of the WebGL canvas. */
  width: number;
  height: number;
  /** CSS pixel size, for checking the DPR relationship. */
  clientWidth: number;
  clientHeight: number;
  /** Distinct RGB colours in a 64×64 downsample of the canvas. */
  distinctColors: number;
  /** Luminance variance of the downsample — 0 for a blank capture. */
  variance: number;
  blobSize: number;
  blobType: string;
}

function captureMapCanvas(page: Page): Promise<CanvasCapture> {
  return page.evaluate(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('.maplibregl-canvas');

    if (!canvas) {
      throw new Error('Map canvas not found');
    }

    // PNG-encode the WebGL canvas exactly like captureMap does.
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((encoded) => {
        if (encoded) {
          resolve(encoded);
        } else {
          reject(new Error('Map canvas produced an empty snapshot'));
        }
      }, 'image/png');
    });

    // Downsample onto a 2D canvas and measure the pixels. Without
    // preserveDrawingBuffer this drawImage reads a cleared buffer.
    const sample = document.createElement('canvas');
    sample.width = 64;
    sample.height = 64;
    const context = sample.getContext('2d');

    if (!context) {
      throw new Error('No 2D context for sampling');
    }

    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    const { data } = context.getImageData(0, 0, sample.width, sample.height);

    const colors = new Set<number>();
    const count = data.length / 4;
    let sum = 0;
    let sumOfSquares = 0;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      colors.add((red << 16) | (green << 8) | blue);
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      sum += luminance;
      sumOfSquares += luminance * luminance;
    }

    const mean = sum / count;

    return {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      distinctColors: colors.size,
      variance: sumOfSquares / count - mean * mean,
      blobSize: blob.size,
      blobType: blob.type,
    };
  });
}

for (const deviceScaleFactor of [1, 2]) {
  test.describe(`map capture at device pixel ratio ${String(deviceScaleFactor)}`, () => {
    test.use({ deviceScaleFactor, viewport: { width: 1280, height: 800 } });

    test('repeated captures are non-blank with real pixel variance', async ({
      page,
    }) => {
      // Real tile loading over the network can take a while.
      test.slow();

      await page.goto('./');
      await expect(page.locator('.maplibregl-canvas')).toBeVisible();

      // Wait until the map has actually drawn content — a fresh WebGL canvas
      // is a single flat colour (1 distinct colour, zero variance).
      await expect
        .poll(async () => (await captureMapCanvas(page)).distinctColors, {
          timeout: 60_000,
        })
        .toBeGreaterThan(16);

      const first = await captureMapCanvas(page);
      const second = await captureMapCanvas(page);

      for (const capture of [first, second]) {
        expect(capture.blobType).toBe('image/png');
        expect(capture.blobSize).toBeGreaterThan(0);
        expect(capture.distinctColors).toBeGreaterThan(16);
        expect(capture.variance).toBeGreaterThan(1);
        // Physical size follows the DPR, so captures stay sharp on hi-dpi.
        // clientWidth/clientHeight round to whole CSS pixels, so allow the
        // sub-pixel rounding maplibre applies when sizing the canvas.
        expect(
          Math.abs(capture.width - capture.clientWidth * deviceScaleFactor),
        ).toBeLessThanOrEqual(deviceScaleFactor);
        expect(
          Math.abs(capture.height - capture.clientHeight * deviceScaleFactor),
        ).toBeLessThanOrEqual(deviceScaleFactor);
      }

      // Deterministic dimensions across repeated captures.
      expect(second.width).toBe(first.width);
      expect(second.height).toBe(first.height);
    });
  });
}
