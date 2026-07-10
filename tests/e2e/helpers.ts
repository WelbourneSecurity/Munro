import { expect, type Page } from '@playwright/test';

/** Persist key of the Zustand progress store (src/store/progress.ts). */
export const PROGRESS_STORAGE_KEY = 'munro.progress.v1';

/** Persisted schema version — matches BACKUP_VERSION in src/store/progress.ts. */
export const PROGRESS_STORAGE_VERSION = 1;

/**
 * A peak with a stable DoBIH id, used across specs. Ids come from
 * src/data/wainwrights.json and are stable across data refreshes.
 */
export const ARD_CRAGS = { id: 'dobih-2460', name: 'Ard Crags' };
export const ALLEN_CRAGS = { id: 'dobih-2388', name: 'Allen Crags' };

/** The PeakProgress record shape as persisted (see wiki/data.md). */
export interface StoredProgressRecord {
  peakId: string;
  bagged: boolean;
  baggedDate?: string;
  notes?: string;
}

/** Zustand `persist` envelope written to localStorage. */
interface PersistedProgress {
  state: {
    progressByPeakId: Record<string, StoredProgressRecord>;
  };
  version: number;
}

/** Read and unwrap the persisted progress records from localStorage. */
export async function readProgressStorage(
  page: Page,
): Promise<Record<string, StoredProgressRecord>> {
  const raw = await page.evaluate(
    (key) => localStorage.getItem(key),
    PROGRESS_STORAGE_KEY,
  );

  if (!raw) {
    return {};
  }

  const persisted = JSON.parse(raw) as PersistedProgress;
  return persisted.state.progressByPeakId;
}

/**
 * Seed progress records straight into localStorage. Call this AFTER a first
 * navigation to the app origin (an init script would race the store's
 * rehydration), then `page.reload()` so the store picks the seed up.
 */
export async function seedProgressStorage(
  page: Page,
  records: StoredProgressRecord[],
): Promise<void> {
  const persisted: PersistedProgress = {
    state: {
      progressByPeakId: Object.fromEntries(
        records.map((record) => [record.peakId, record]),
      ),
    },
    version: PROGRESS_STORAGE_VERSION,
  };

  await page.evaluate(
    ({ key, payload }) => {
      localStorage.setItem(key, payload);
    },
    { key: PROGRESS_STORAGE_KEY, payload: JSON.stringify(persisted) },
  );
}

/**
 * Hosts of the external tile/terrain services the map depends on: OpenFreeMap
 * vector tiles, sprites and glyphs, and the AWS Terrarium DEM tiles (see
 * src/map/config.ts and src/map/style/munro-dark.json). Failures reaching
 * these hosts are third-party availability, not app regressions — a sandboxed
 * proxy or a CDN hiccup must not fail the suite.
 */
const EXTERNAL_TILE_HOSTS = new Set(['tiles.openfreemap.org', 's3.amazonaws.com']);

/**
 * Message shapes a network failure can take: Chromium's resource-load console
 * errors, fetch rejections, MapLibre's AJAXError, and net:: error codes.
 * Matching this shape alone is NOT enough to be exempt — the failure must
 * also be attributable to an external tile host (see isExternalTileFailure).
 */
const NETWORK_FAILURE_MESSAGE =
  /Failed to load resource|Failed to fetch|AJAXError|net::ERR_/;

/**
 * MapLibre's tile machinery (maplibre-contour's DEM worker in particular)
 * rejects with a bare `timed out` error that carries no URL, so it cannot be
 * host-scoped. Anchored to the start of the message so only that exact error
 * shape is exempt; no first-party code throws it.
 */
const TILE_WORKER_TIMEOUT = /^(Error: )?timed out\b/;

const URL_IN_TEXT = /https?:\/\/[^\s'")]+/g;

function isExternalTileHostUrl(url: string): boolean {
  try {
    return EXTERNAL_TILE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * True only for network failures attributable to an external tile host — via
 * the console message's location URL (Chromium sets it to the failing
 * resource for "Failed to load resource") or a URL embedded in the message
 * text (MapLibre's AJAXError, "Failed to fetch dynamically imported module").
 * A network-shaped failure with no external-host URL — a same-origin 404'd
 * asset, a broken code-split chunk — still counts as an error.
 */
export function isExternalTileFailure(text: string, locationUrl?: string): boolean {
  if (TILE_WORKER_TIMEOUT.test(text)) {
    return true;
  }

  if (!NETWORK_FAILURE_MESSAGE.test(text)) {
    return false;
  }

  const candidateUrls: string[] = text.match(URL_IN_TEXT) ?? [];

  if (locationUrl) {
    candidateUrls.push(locationUrl);
  }

  // `some`, not `every`: MapLibre logs tile failures via console.error, so
  // the location URL is the first-party bundle while the failing tile URL is
  // in the text.
  return candidateUrls.some(isExternalTileHostUrl);
}

/**
 * Start collecting console errors and uncaught page errors, minus failures
 * attributable to the external tile hosts. Register before `page.goto` so
 * nothing is missed; assert the returned array at the end.
 */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !isExternalTileFailure(message.text(), message.location().url)
    ) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    if (!isExternalTileFailure(error.message)) {
      errors.push(error.message);
    }
  });

  return errors;
}

/**
 * Wait until the map canvas exists and has actually drawn content. The peak
 * markers are painted onto the WebGL canvas (not DOM elements), so their
 * presence is asserted the way the implementation plan allows — a drawn,
 * multi-colour canvas — rather than by sampling specific pixel colours.
 */
export async function waitForMapDrawn(page: Page): Promise<void> {
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const canvas =
            document.querySelector<HTMLCanvasElement>('.maplibregl-canvas');

          if (!canvas) {
            return 0;
          }

          const sample = document.createElement('canvas');
          sample.width = 32;
          sample.height = 32;
          const context = sample.getContext('2d');

          if (!context) {
            return 0;
          }

          // Reads real pixels because MapView creates the map with
          // preserveDrawingBuffer; a fresh canvas is one flat colour.
          context.drawImage(canvas, 0, 0, sample.width, sample.height);
          const { data } = context.getImageData(0, 0, sample.width, sample.height);
          const colors = new Set<number>();

          for (let index = 0; index < data.length; index += 4) {
            colors.add(
              ((data[index] ?? 0) << 16) |
                ((data[index + 1] ?? 0) << 8) |
                (data[index + 2] ?? 0),
            );
          }

          return colors.size;
        }),
      { timeout: 60_000 },
    )
    .toBeGreaterThan(16);
}
