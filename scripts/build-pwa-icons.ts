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

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(projectRoot, 'public');
const iconsDir = path.join(publicDir, 'icons');

// Palette — keep in sync with the theme tokens in src/index.css.
const SURFACE = '#111713';
const RING = '#96a095';
const SUMMIT = '#a7d8b6';

/**
 * The Munro mark: three irregular contour rings closing on a summit dot,
 * drawn in a 512x512 box. `markScale` shrinks the mark towards the centre
 * so maskable icons keep the mark inside the safe zone.
 */
function buildMarkSvg(markScale: number): string {
  const translate = (512 * (1 - markScale)) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${SURFACE}"/>
  <g transform="translate(${translate} ${translate}) scale(${markScale})"
     fill="none" stroke="${RING}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 106 300 C 100 222 168 128 264 122 C 352 118 410 206 404 290 C 398 352 340 392 250 394 C 162 396 112 362 106 300 Z"/>
    <path d="M 162 294 C 158 238 202 176 264 172 C 322 168 356 224 352 282 C 349 328 310 354 252 356 C 200 358 165 340 162 294 Z"/>
    <path d="M 216 288 C 214 252 236 216 262 214 C 290 212 308 244 306 280 C 304 308 284 322 258 323 C 232 324 218 314 216 288 Z"/>
    <circle cx="260" cy="268" r="15" fill="${SUMMIT}" stroke="none"/>
  </g>
</svg>
`;
}

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

  await writeFile(path.join(publicDir, 'favicon.svg'), buildMarkSvg(0.98), 'utf8');
  console.log('wrote public/favicon.svg');

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
