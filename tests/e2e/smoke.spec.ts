import { expect, test } from '@playwright/test';

import { collectPageErrors, selectHillList, waitForMapDrawn } from './helpers';

test('loads the tracker with a drawn map, the collated peaks and no errors', async ({
  page,
}) => {
  // Real tile loading over the network can take a while.
  test.slow();

  const errors = collectPageErrors(page);

  await page.goto('./');

  // The default view collates every hill list, deduplicated.
  await expect(page).toHaveTitle('Munro');
  await expect(page.getByRole('heading', { name: 'All peaks' })).toBeVisible();
  await expect(page.getByText('United Kingdom', { exact: true })).toBeVisible();
  await expect(page.getByText('2170 peaks')).toBeVisible();
  await expect(page.getByLabel('Terrain')).toBeChecked();

  // Map canvas rendered with real content, checked on the default view: its
  // thousands of visible markers guarantee colour variance even when the
  // external tile hosts are slow, unlike the Wainwrights view below whose
  // markers give way to subtle hill lighting. The peak markers are map
  // layers painted onto this canvas, so a drawn canvas is how their
  // presence is asserted (no pixel-colour testing, per the implementation
  // plan).
  await waitForMapDrawn(page);

  // Narrowing to a single published list still works, with its exact count.
  await selectHillList(page, 'wainwrights');
  await expect(page.getByRole('heading', { name: 'Wainwrights' })).toBeVisible();
  await expect(page.getByText('Lake District', { exact: true })).toBeVisible();

  // Every Wainwright reaches the list panel with an unbagged indicator. The
  // panel renders rows in windows that grow on scroll (see PeakListPanel), so
  // expand the list fully before counting. dispatchEvent avoids a regular
  // click's actionability wait, which can race the IntersectionObserver
  // auto-growth re-rendering the button mid-click; toPass retries the whole
  // expand-then-count block if the button detaches between steps.
  await expect(page.getByText('214 shown')).toBeVisible();
  await expect(async () => {
    const showMore = page.getByRole('button', { name: /^Show \d+ more$/ });

    if ((await showMore.count()) > 0) {
      await showMore.first().dispatchEvent('click');
    }

    await expect(page.getByLabel('Unbagged')).toHaveCount(214, { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  expect(errors).toEqual([]);
});
