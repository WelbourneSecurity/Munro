import { expect, test } from '@playwright/test';

import { ARD_CRAGS, readProgressStorage } from './helpers';

// Bag through the UI, then check each stage separately so a failure
// distinguishes UI bugs (stats line), save bugs (localStorage payload)
// and rehydration bugs (state after reload).
test('a bagged peak persists across a reload', async ({ page }) => {
  await page.goto('./');

  // Bag one peak via the list panel — quick enough not to need seeding.
  await page.getByRole('searchbox', { name: 'Search peaks' }).fill(ARD_CRAGS.name);
  await page.getByRole('button', { name: new RegExp(ARD_CRAGS.name) }).click();
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
