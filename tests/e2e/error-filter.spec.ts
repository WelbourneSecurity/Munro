import { expect, test } from '@playwright/test';

import { isExternalTileFailure } from './helpers';

/**
 * Pure checks (no browser) on the error filter behind collectPageErrors: only
 * failures attributable to the external tile hosts are exempt; first-party
 * resource failures must surface as errors.
 */

test.describe('isExternalTileFailure', () => {
  test('exempts a resource failure located at a tile host', () => {
    expect(
      isExternalTileFailure(
        'Failed to load resource: the server responded with a status of 404',
        'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf',
      ),
    ).toBe(true);
    expect(
      isExternalTileFailure(
        'Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED',
        'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/10/507/328.png',
      ),
    ).toBe(true);
  });

  test('exempts MapLibre errors that embed a tile-host URL in the text', () => {
    expect(
      isExternalTileFailure(
        'AJAXError: Not Found (404): https://tiles.openfreemap.org/planet/10/507/328.pbf',
        'http://127.0.0.1:4173/assets/index-abc123.js',
      ),
    ).toBe(true);
  });

  test('exempts the URL-less maplibre-contour worker timeout only at message start', () => {
    expect(isExternalTileFailure('timed out')).toBe(true);
    expect(isExternalTileFailure('Error: timed out')).toBe(true);
    expect(isExternalTileFailure('Export failed: Error: timed out')).toBe(false);
  });

  test('counts a same-origin 404 as an error', () => {
    expect(
      isExternalTileFailure(
        'Failed to load resource: the server responded with a status of 404',
        'http://127.0.0.1:4173/favicon.svg',
      ),
    ).toBe(false);
  });

  test('counts a broken code-split chunk as an error', () => {
    expect(
      isExternalTileFailure(
        'TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:4173/assets/export-abc123.js',
      ),
    ).toBe(false);
  });

  test('counts network-shaped failures with no attributable URL as errors', () => {
    expect(isExternalTileFailure('TypeError: Failed to fetch')).toBe(false);
    expect(isExternalTileFailure('Failed to load resource', '')).toBe(false);
  });

  test('ignores non-network errors entirely', () => {
    expect(
      isExternalTileFailure(
        'Uncaught TypeError: x is undefined',
        'http://127.0.0.1:4173/assets/index-abc123.js',
      ),
    ).toBe(false);
  });
});
