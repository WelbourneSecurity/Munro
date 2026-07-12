/**
 * Generates the committed PWA icons in `public/` from a hand-authored SVG
 * mark: concentric contour rings around a soft-green summit point, on the
 * app's dark surface colour. Run with `npm run data:icons` after changing
 * the mark; the PNG outputs are committed so builds never rasterize.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { buildMarkSvg } from './icon-mark';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(projectRoot, 'public');
const iconsDir = path.join(publicDir, 'icons');

interface PngTarget {
  file: string;
  markScale: number;
  size: number;
}

// Maskable icons must keep the mark inside the central safe zone (a circle
// with radius 40% of the icon size), so the mark is scaled down further.
const targets: PngTarget[] = [
  { file: path.join(iconsDir, 'icon-192.png'), markScale: 0.92, size: 192 },
  { file: path.join(iconsDir, 'icon-512.png'), markScale: 0.92, size: 512 },
  { file: path.join(iconsDir, 'icon-maskable-512.png'), markScale: 0.7, size: 512 },
  { file: path.join(iconsDir, 'apple-touch-icon.png'), markScale: 0.82, size: 180 },
];

async function main(): Promise<void> {
  await mkdir(iconsDir, { recursive: true });

  // public/favicon.svg is deliberately NOT generated here: the committed
  // favicon is a hand-authored 32x32 mark that stays legible at tab size,
  // where the 512px contour rings would blur to noise.

  for (const target of targets) {
    const svg = Buffer.from(buildMarkSvg(target.markScale));
    const png = await sharp(svg, { density: (72 * target.size) / 512 })
      .resize(target.size, target.size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(target.file, png);
    console.log(
      `wrote ${path.relative(projectRoot, target.file)} (${target.size}x${target.size})`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
