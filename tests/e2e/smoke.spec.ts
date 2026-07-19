import { expect, test } from '@playwright/test';

import { collectPageErrors, selectRangeEdition, waitForMapDrawn } from './helpers';

test('loads the UK explorer and the Wainwright logbook without errors', async ({
  page,
}) => {
  test.slow();
  const errors = collectPageErrors(page);

  await page.goto('./#/explore');

  await expect(page).toHaveTitle('Munro');
  await expect(page.getByLabel('Explore United Kingdom')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Find a hill' })).toBeVisible();
  await expect(page.getByRole('link', { name: '0 of 5471 hills bagged' })).toBeVisible({
    timeout: 30_000,
  });
  await waitForMapDrawn(page);

  await selectRangeEdition(page, 'Wainwrights');
  await expect(page.getByLabel('Explore Wainwrights')).toBeVisible();

  await page
    .locator('nav[aria-label="Primary"]:visible')
    .getByRole('link', { name: 'Logbook' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your Wainwrights logbook.' }),
  ).toBeVisible();
  await expect(page.getByText('330 hills shown')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Eastern Fells', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Ard Crags.*open/ })).toBeVisible();

  expect(errors).toEqual([]);
});
