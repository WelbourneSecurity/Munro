import { expect, test } from '@playwright/test';

import { ARD_CRAGS, readProgressStorage, selectRangeEdition } from './helpers';

test('searches, bags, persists, removes and restores a hill', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('./#/explore');
  await selectRangeEdition(page, 'Wainwrights');

  await page.getByRole('button', { name: 'Find a hill' }).click();
  const search = page.getByRole('dialog', { name: 'Find a hill' });
  await search.getByRole('searchbox', { name: 'Search hills' }).fill(ARD_CRAGS.name);
  await search.getByRole('button').filter({ hasText: ARD_CRAGS.name }).click();

  await expect(page.getByRole('heading', { name: ARD_CRAGS.name })).toBeVisible();
  await page.getByRole('button', { name: 'Bag this hill' }).click();
  await expect(
    page.locator('[role="status"]').filter({
      hasText: `${ARD_CRAGS.name} added to your logbook.`,
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: '1 of 330 hills bagged' })).toBeVisible();

  const stored = await readProgressStorage(page);
  expect(stored[ARD_CRAGS.id]).toMatchObject({
    peakId: ARD_CRAGS.id,
    bagged: true,
  });
  expect(stored[ARD_CRAGS.id]?.baggedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  await page
    .locator('nav[aria-label="Primary"]:visible')
    .getByRole('link', { name: 'Logbook' })
    .click();
  const tile = page.getByRole('button', { name: /Ard Crags.*bagged/ });
  await expect(tile).toBeVisible();

  await page.reload();
  await expect(page.getByRole('link', { name: '1 of 330 hills bagged' })).toBeVisible();
  await page.getByRole('button', { name: /Ard Crags.*bagged/ }).click();
  await page.getByRole('button', { name: 'Remove status' }).click();
  await expect(page.getByRole('button', { name: /Ard Crags.*open/ })).toBeVisible();

  await page
    .locator('[role="status"]')
    .filter({ hasText: `${ARD_CRAGS.name} removed from your logbook.` })
    .getByRole('button', { name: 'Undo' })
    .click();
  await expect(page.getByRole('button', { name: /Ard Crags.*bagged/ })).toBeVisible();
  expect((await readProgressStorage(page))[ARD_CRAGS.id]).toEqual(stored[ARD_CRAGS.id]);
});
