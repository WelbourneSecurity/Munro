import { expect, test } from '@playwright/test';

import {
  ARD_CRAGS,
  readProgressStorage,
  seedProgressStorage,
  selectHillList,
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
  await selectHillList(page, 'wainwrights');

  await page.getByRole('button', { name: /Ard Crags.*bagged/ }).click();
  await expect(page.getByText('Recorded 12 Jul 2026')).toBeVisible();
  await expect(page.getByLabel('Notes')).toHaveValue('Windy summit.');
  expect((await readProgressStorage(page))[ARD_CRAGS.id]).toMatchObject({
    baggedDate: '2026-07-12',
    notes: 'Windy summit.',
  });
});
