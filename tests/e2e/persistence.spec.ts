import { expect, test } from '@playwright/test';

import { ARD_CRAGS, readProgressStorage, waitForMapDrawn } from './helpers';

// Bag through the UI, then check each stage separately so a failure
// distinguishes UI bugs (stats line), save bugs (localStorage payload)
// and rehydration bugs (state after reload).
test('a bagged peak persists across a reload', async ({ page }) => {
  // Two map draws (initial view + the post-reload rehydration) plus the
  // list interaction run slowly under parallel CI load; give the same
  // headroom the export flow gets.
  test.setTimeout(90_000);

  await page.goto('./');

  // Let the initial view settle before interacting: selecting a peak flies
  // the camera, and clicking "Mark bagged" while tiles are still loading
  // leaves the button failing Playwright's stability check under load.
  await waitForMapDrawn(page);

  // Bag one peak via the list panel — quick enough not to need seeding.
  await page.getByRole('searchbox', { name: 'Search peaks' }).fill(ARD_CRAGS.name);
  await page.getByRole('button', { name: new RegExp(ARD_CRAGS.name) }).click();
  await expect(page.getByRole('heading', { name: ARD_CRAGS.name })).toBeVisible();
  await page.getByRole('button', { name: 'Mark bagged' }).click();
  await expect(page.getByText('1 / 214 bagged')).toBeVisible();

  // Saved: the munro.progress.v1 payload contains the record.
  const stored = await readProgressStorage(page);
  expect(stored[ARD_CRAGS.id]).toMatchObject({
    peakId: ARD_CRAGS.id,
    bagged: true,
  });

  await page.reload();

  // Rehydrated: still bagged in the UI…
  await expect(page.getByText('1 / 214 bagged')).toBeVisible();
  await page.getByRole('button', { name: 'Bagged', exact: true }).click();
  const item = page.getByRole('button', { name: new RegExp(ARD_CRAGS.name) });
  await expect(item).toBeVisible();
  await expect(item.getByLabel('Bagged')).toBeVisible();

  // …and still in storage.
  const rehydrated = await readProgressStorage(page);
  expect(rehydrated[ARD_CRAGS.id]).toMatchObject({
    peakId: ARD_CRAGS.id,
    bagged: true,
  });
});
