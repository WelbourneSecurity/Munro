import { expect, test } from '@playwright/test';

test('loads the Munro shell without console errors', async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('./');

  await expect(page).toHaveTitle('Munro');
  await expect(page.getByRole('heading', { name: 'Wainwrights' })).toBeVisible();
  await expect(page.getByText('Lake District', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Terrain')).toBeChecked();
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
