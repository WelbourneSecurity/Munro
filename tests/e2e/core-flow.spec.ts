import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { ARD_CRAGS, selectHillList, waitForMapDrawn } from './helpers';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

test('selects a peak, bags it and exports a PNG', async ({ page }) => {
  // Two rounds of tile loading (initial view + export framing) take a while.
  test.setTimeout(180_000);

  await page.goto('./');
  await waitForMapDrawn(page);

  // Narrow from the collated default to the Wainwrights, whose published
  // count the stats assertion below relies on.
  await selectHillList(page, 'wainwrights');

  // Select the peak through the list panel (the accessible, reliable path).
  await page.getByRole('searchbox', { name: 'Search peaks' }).fill(ARD_CRAGS.name);
  await page.getByRole('button', { name: new RegExp(ARD_CRAGS.name) }).click();
  await expect(page.getByRole('heading', { name: ARD_CRAGS.name })).toBeVisible();

  // Bag it; the stats line and the toggle both reflect the change.
  await page.getByRole('button', { name: 'Mark bagged' }).click();
  await expect(page.getByText('1 / 214 bagged')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark unbagged' })).toBeVisible();

  // Turn terrain off before exporting. The export composition waits for the
  // map to go idle, and the AWS DEM/contour tiles never settle when a
  // sandboxed proxy or slow network stalls them — the basemap and markers
  // (all the export needs asserting) render without terrain, deterministically.
  await page.getByLabel('Terrain').uncheck();

  // Export: open the dialog, wait for composition, download the PNG.
  await page.getByRole('button', { name: 'Export image' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export image' });
  await expect(dialog).toBeVisible();

  const downloadButton = dialog.getByRole('button', { name: 'Download PNG' });
  await expect(downloadButton).toBeEnabled({ timeout: 60_000 });

  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.png$/);

  const exported = await readFile(await download.path());
  expect(exported.length).toBeGreaterThan(1024);
  expect([...exported.subarray(0, PNG_SIGNATURE.length)]).toEqual(PNG_SIGNATURE);
});
