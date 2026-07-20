import { expect, test } from '@playwright/test';

import {
  ARD_CRAGS,
  readProgressStorage,
  seedProgressStorage,
  selectRangeEdition,
} from './helpers';

test('rehydrates existing local progress without a migration', async ({ page }) => {
  await page.goto('./#/logbook');
  await seedProgressStorage(page, [
    {
      peakId: ARD_CRAGS.id,
      bagged: true,
      baggedDate: '2026-07-12',
      notes: 'Windy summit.',
    },
  ]);
  await page.reload();
  await selectRangeEdition(page, 'Wainwrights');

  await page.getByRole('button', { name: /Ard Crags.*bagged/ }).click();
  await expect(page.getByText('Recorded 12 Jul 2026')).toBeVisible();
  await expect(page.getByLabel('Notes')).toHaveValue('Windy summit.');
  expect((await readProgressStorage(page))[ARD_CRAGS.id]).toMatchObject({
    baggedDate: '2026-07-12',
    notes: 'Windy summit.',
  });
});

test('keeps bagged progress for a later browser session', async ({
  browser,
}, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const firstSession = await browser.newContext({ baseURL });
  const firstPage = await firstSession.newPage();
  await firstPage.goto('./#/logbook');
  await selectRangeEdition(firstPage, 'Wainwrights');

  await firstPage.getByRole('button', { name: /Ard Crags.*open/ }).click();
  await firstPage.getByRole('button', { name: 'Bag this hill' }).click();
  await expect(
    firstPage.getByRole('link', { name: '1 of 330 hills bagged' }),
  ).toBeVisible();

  const stored = await readProgressStorage(firstPage);
  expect(stored[ARD_CRAGS.id]).toMatchObject({
    peakId: ARD_CRAGS.id,
    bagged: true,
  });
  const savedBrowserState = await firstSession.storageState();
  await firstSession.close();

  const returningSession = await browser.newContext({
    baseURL,
    storageState: savedBrowserState,
  });
  const returningPage = await returningSession.newPage();
  await returningPage.goto('./#/logbook');

  await expect(
    returningPage.getByRole('link', { name: '1 of 330 hills bagged' }),
  ).toBeVisible();
  await expect(
    returningPage.getByRole('button', { name: /Ard Crags.*bagged/ }),
  ).toBeVisible();
  expect((await readProgressStorage(returningPage))[ARD_CRAGS.id]).toEqual(
    stored[ARD_CRAGS.id],
  );
  await returningSession.close();
});
