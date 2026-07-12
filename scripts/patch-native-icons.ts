/**
 * Replaces the default Capacitor launcher icons in a generated native
 * project with the Munro mark, so installed builds don't ship Capacitor's
 * placeholder icon. The native projects are generated fresh in CI
 * (`npx cap add <platform>`), so this runs after `cap sync` rather than
 * committing icon assets. Idempotent: re-running just rewrites the PNGs.
 *
 * - iOS: renders every image declared in AppIcon.appiconset/Contents.json
 *   at its pixel size (size x scale).
 * - Android: overwrites every ic_launcher*.png under res/mipmap-*, keeping
 *   each file's original pixel size. Adaptive-icon foregrounds are drawn
 *   on a transparent canvas scaled to the central safe zone, with the
 *   ic_launcher_background colour resource set to the app surface colour.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { SURFACE, buildMarkSvg } from './icon-mark';

const IOS_APPICONSET = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
const ANDROID_RES = 'android/app/src/main/res';

async function renderPng(
  sizePx: number,
  markScale: number,
  background?: string,
): Promise<Buffer> {
  const svg = Buffer.from(buildMarkSvg(markScale, background));

  return sharp(svg, { density: (72 * sizePx) / 512 })
    .resize(sizePx, sizePx)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

interface AppIconSetContents {
  images?: { filename?: string; scale?: string; size?: string }[];
}

async function patchIos(): Promise<void> {
  const contentsPath = path.join(IOS_APPICONSET, 'Contents.json');

  if (!existsSync(contentsPath)) {
    console.error(`No app icon set at ${contentsPath} — run "cap add ios" first.`);
    process.exitCode = 1;
    return;
  }

  const contents = JSON.parse(readFileSync(contentsPath, 'utf8')) as AppIconSetContents;
  let written = 0;

  for (const image of contents.images ?? []) {
    if (!image.filename || !image.size) {
      continue;
    }

    const basePoints = Number.parseFloat(image.size.split('x')[0] ?? '');
    const scale = Number.parseFloat((image.scale ?? '1x').replace(/x$/, ''));

    if (!Number.isFinite(basePoints) || !Number.isFinite(scale)) {
      continue;
    }

    const sizePx = Math.round(basePoints * scale);
    // iOS rounds its own corners; 0.82 matches the apple-touch-icon crop.
    writeFileSync(
      path.join(IOS_APPICONSET, image.filename),
      await renderPng(sizePx, 0.82),
    );
    written += 1;
    console.log(`wrote ${IOS_APPICONSET}/${image.filename} (${String(sizePx)}px)`);
  }

  if (written === 0) {
    console.error(`No icon images declared in ${contentsPath}.`);
    process.exitCode = 1;
  }
}

async function patchAndroid(): Promise<void> {
  if (!existsSync(ANDROID_RES)) {
    console.error(`No resources at ${ANDROID_RES} — run "cap add android" first.`);
    process.exitCode = 1;
    return;
  }

  let written = 0;

  for (const dir of readdirSync(ANDROID_RES).filter((entry) =>
    entry.startsWith('mipmap-'),
  )) {
    const mipmapDir = path.join(ANDROID_RES, dir);

    for (const file of readdirSync(mipmapDir).filter(
      (entry) => entry.startsWith('ic_launcher') && entry.endsWith('.png'),
    )) {
      const target = path.join(mipmapDir, file);
      const metadata = await sharp(target).metadata();
      const sizePx = metadata.width ?? 0;

      if (sizePx === 0) {
        continue;
      }

      // Adaptive foregrounds only show the central safe zone (~2/3 of the
      // canvas) and get their background from the colour resource below.
      const isForeground = file.includes('foreground');
      const png = isForeground
        ? await renderPng(sizePx, 0.5, 'none')
        : await renderPng(sizePx, 0.9);
      writeFileSync(target, png);
      written += 1;
      console.log(`wrote ${path.join(dir, file)} (${String(sizePx)}px)`);
    }
  }

  if (written === 0) {
    console.error(`No launcher PNGs found under ${ANDROID_RES}/mipmap-*.`);
    process.exitCode = 1;
    return;
  }

  // Adaptive icons compose the transparent foreground over this colour.
  const backgroundXml = path.join(ANDROID_RES, 'values', 'ic_launcher_background.xml');

  if (existsSync(backgroundXml)) {
    const xml = readFileSync(backgroundXml, 'utf8');
    const patched = xml.replace(
      /(<color name="ic_launcher_background">)[^<]*(<\/color>)/,
      `$1${SURFACE}$2`,
    );
    writeFileSync(backgroundXml, patched);
    console.log(`set ic_launcher_background to ${SURFACE}`);
  }
}

const platform = process.argv[2];

if (platform === 'ios') {
  await patchIos();
} else if (platform === 'android') {
  await patchAndroid();
} else {
  console.error('Usage: tsx scripts/patch-native-icons.ts <android|ios>');
  process.exitCode = 1;
}
