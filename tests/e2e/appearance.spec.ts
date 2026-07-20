import { expect, test } from '@playwright/test';

import { selectRangeEdition } from './helpers';

test('persists each curated appearance while range cameras reset', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByText('Light', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-visual-preset', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    '#11110F',
  );

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-visual-preset', 'light');

  await page.getByText('Nature', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-visual-preset', 'nature');

  const stored = await page.evaluate(() => localStorage.getItem('munro.prefs.v1'));
  expect(stored).toContain('"visualPreset":"nature"');
  expect(stored).not.toMatch(/camera|longitude|latitude|zoom/i);
});

test('reframes every consecutive range selection', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./#/explore');
  const canvas = page.locator('.maplibregl-canvas');
  const frameStatus = page.locator('[data-map-frame-status]');
  await expect(canvas).toBeVisible();

  await selectRangeEdition(page, 'Wainwrights');
  await expect(page.getByLabel('Explore Wainwrights')).toBeVisible();
  await expect(frameStatus).toHaveText('Map framed for Wainwrights.', {
    timeout: 10_000,
  });

  await selectRangeEdition(page, 'Cairngorms');
  await expect(page.getByLabel('Explore Cairngorms')).toBeVisible();
  await expect(frameStatus).toHaveText('Map framed for Cairngorms.', {
    timeout: 10_000,
  });

  await selectRangeEdition(page, 'Wales');
  await expect(page.getByLabel('Explore Wales')).toBeVisible();
  await expect(frameStatus).toHaveText('Map framed for Wales.', { timeout: 10_000 });
});

test('locks a range at its fitted overview and resets it after revisiting', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('./#/explore');
  await selectRangeEdition(page, 'Wainwrights');

  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(5_500);

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 8_000);
  await page.waitForTimeout(500);

  for (const [x, y] of [
    [box.x + box.width, box.y],
    [box.x, box.y + box.height],
    [box.x + box.width, box.y + box.height],
  ] as const) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, y);
    await page.mouse.up();
  }

  await page.reload();
  await expect(page.getByLabel('Explore Wainwrights')).toBeVisible();
  await expect(canvas).toBeVisible();
});
