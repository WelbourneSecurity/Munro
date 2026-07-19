import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import {
  ALLEN_CRAGS,
  ARD_CRAGS,
  readProgressStorage,
  seedProgressStorage,
  type StoredProgressRecord,
} from './helpers';

const SEEDED: StoredProgressRecord[] = [
  { peakId: ALLEN_CRAGS.id, bagged: true, baggedDate: '2026-07-01' },
  { peakId: ARD_CRAGS.id, bagged: true },
];

interface BackupFile {
  version: number;
  exportedAt: string;
  progress: StoredProgressRecord[];
}

test('backup exports, reset clears and import restores progress', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);

  await page.goto('./#/explore');
  await page.getByLabel('Hill list').selectOption('wainwrights');
  await seedProgressStorage(page, SEEDED);
  await page.reload();
  await expect(page.getByRole('link', { name: '2 of 214 hills bagged' })).toBeVisible({
    timeout: 30_000,
  });

  await page
    .locator('nav[aria-label="Primary"]:visible')
    .getByRole('link', { name: 'Settings' })
    .click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export progress' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^munro-backup-.+\.json$/);

  const backupPath = testInfo.outputPath('munro-backup.json');
  await download.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, 'utf8')) as BackupFile;
  expect(backup.version).toBe(1);
  expect(backup.progress.map((record) => record.peakId)).toEqual(
    [ALLEN_CRAGS.id, ARD_CRAGS.id].sort(),
  );

  await expect(page.getByRole('button', { name: 'Reset progress' })).toBeDisabled();
  await page.getByLabel('Reset confirmation').fill('RESET');
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.getByText('Local progress has been reset.')).toBeVisible();
  expect(await readProgressStorage(page)).toEqual({});

  await page.getByLabel('Choose backup JSON').setInputFiles(backupPath);
  await expect(page.getByText('Ready to import 2 records, 2 bagged.')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm import' }).click();
  await expect(page.getByText('Imported 2 records, 2 bagged.')).toBeVisible();

  const restored = await readProgressStorage(page);
  expect(Object.keys(restored).sort()).toEqual([ALLEN_CRAGS.id, ARD_CRAGS.id].sort());
  expect(restored[ALLEN_CRAGS.id]).toMatchObject({ baggedDate: '2026-07-01' });

  await page
    .locator('nav[aria-label="Primary"]:visible')
    .getByRole('link', { name: 'Explore' })
    .click();
  await expect(page.getByRole('link', { name: '2 of 214 hills bagged' })).toBeVisible({
    timeout: 30_000,
  });
});
