/**
 * Enforces the performance budget documented in wiki/operations.md against
 * a built `dist/`. Run automatically after the build in `npm run verify`
 * and in CI, so a PR that blows the budget fails loudly instead of shipping
 * a slower first load.
 *
 * Thresholds (gzip, matching the wiki):
 * - Total initial JS <= 650 kB — the eagerly-loaded index chunk. The export
 *   engine and the PWA register helper are lazy chunks and deliberately
 *   excluded.
 * - Default-list data <= 560 kB — the 22 hill-list chunks the collated
 *   "All peaks" default view fetches on first visit. They are lazy chunks,
 *   but the default list awaits all of them before the first peak renders,
 *   so they are part of the real first-load payload. The ceiling absorbed
 *   the full UK list set (HuMPs and Simms dominate); it is a hard stop
 *   against further growth, not headroom to spend.
 * - Historical hill-profile data is absent from the runtime bundle. The
 *   generation pipeline remains available, but approximate polygons must
 *   not be downloaded or presented as real hill shapes.
 * - CSS <= 20 kB.
 * - Export engine <= 20 kB and present as its own lazy chunk — if it ever
 *   folds into the main chunk this check fails on both counts.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ASSETS_DIR = 'dist/assets';

const INITIAL_JS_BUDGET_BYTES = 650 * 1024;
const DEFAULT_LIST_DATA_BUDGET_BYTES = 560 * 1024;
const CSS_BUDGET_BYTES = 20 * 1024;
const EXPORT_CHUNK_BUDGET_BYTES = 20 * 1024;

// Keep in sync with the source lists in src/data/lists.ts — the collated
// default view loads every one of these chunks before its first render.
const LIST_CHUNK_PATTERN =
  /^(wainwrights|munros|corbetts|grahams|donalds|ethels|hewitts|marilyns|munro-tops|corbett-tops|graham-tops|donald-tops|furths|nuttalls|wainwright-outlying-fells|birketts|fellrangers|deweys|humps|simms|county-tops|trail-100)-.*\.js$/;

function gzipSize(filePath: string): number {
  return gzipSync(readFileSync(filePath), { level: 9 }).length;
}

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} kB gzip`;
}

if (!existsSync(ASSETS_DIR)) {
  console.error(`No ${ASSETS_DIR} — run "npm run build" first.`);
  process.exit(1);
}

const assets = readdirSync(ASSETS_DIR);
const failures: string[] = [];

function check(label: string, files: string[], budgetBytes: number): void {
  if (files.length === 0) {
    failures.push(`${label}: expected matching files in ${ASSETS_DIR}, found none.`);
    return;
  }

  const bytes = files.reduce(
    (total, file) => total + gzipSize(path.join(ASSETS_DIR, file)),
    0,
  );
  const status = bytes <= budgetBytes ? 'ok' : 'OVER BUDGET';

  console.log(
    `${label}: ${formatKb(bytes)} of ${formatKb(budgetBytes)} (${status}) — ${files.join(', ')}`,
  );

  if (bytes > budgetBytes) {
    failures.push(
      `${label} is ${formatKb(bytes)}, over the ${formatKb(budgetBytes)} budget in wiki/operations.md.`,
    );
  }
}

function checkAbsent(label: string, files: string[]): void {
  if (files.length > 0) {
    failures.push(`${label}: unexpected runtime files — ${files.join(', ')}.`);
    return;
  }

  console.log(`${label}: absent from runtime (ok)`);
}

check(
  'Initial JS',
  assets.filter((file) => /^index-.*\.js$/.test(file)),
  INITIAL_JS_BUDGET_BYTES,
);
check(
  'Default-list data (all 22 list chunks)',
  assets.filter((file) => LIST_CHUNK_PATTERN.test(file)),
  DEFAULT_LIST_DATA_BUDGET_BYTES,
);
checkAbsent(
  'Historical hill-profile polygons',
  assets.filter((file) => /^hill-areas.*\.js$/.test(file)),
);
check(
  'CSS',
  assets.filter((file) => file.endsWith('.css')),
  CSS_BUDGET_BYTES,
);
check(
  'Export engine chunk',
  assets.filter((file) => /^export-.*\.js$/.test(file)),
  EXPORT_CHUNK_BUDGET_BYTES,
);

if (failures.length > 0) {
  console.error(`\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('\nBundle budget: all checks passed.');
