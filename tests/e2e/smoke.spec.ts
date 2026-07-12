import { expect, test } from '@playwright/test';

import { collectPageErrors, waitForMapDrawn } from './helpers';

test('loads the tracker with a drawn map, all 214 peaks and no errors', async ({
  page,
}) => {
  // Real tile loading over the network can take a while.
  test.slow();

  const errors = collectPageErrors(page);

  await page.goto('./');

  await expect(page).toHaveTitle('Munro');
  await expect(page.getByRole('heading', { name: 'Wainwrights' })).toBeVisible();
  await expect(page.getByText('Lake District', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Terrain')).toBeChecked();

  // Every Wainwright reaches the list panel with an unbagged indicator. The
  // panel renders rows in windows that grow on scroll (see PeakListPanel),
  // so expand the list fully before counting.
  await expect(page.getByText('214 shown')).toBeVisible();
  const showMore = page.getByRole('button', { name: /^Show \d+ more$/ });
  while (await showMore.count()) {
    await showMore.click();
  }
  await expect(page.getByLabel('Unbagged')).toHaveCount(214);

  // Map canvas rendered with real content. The peak markers are map layers
  // painted onto this canvas, so a drawn canvas is how their presence is
  // asserted (no pixel-colour testing, per the implementation plan).
  await waitForMapDrawn(page);

  expect(errors).toEqual([]);
});
