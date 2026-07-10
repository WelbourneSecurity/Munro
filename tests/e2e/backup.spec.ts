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
  // Home is map-free, so seeding + reload here is cheap. Seed AFTER the
  // first navigation (an init script would race the store's rehydration).
  await page.goto('./#/');
  await seedProgressStorage(page, SEEDED);
  await page.reload();
  await expect(page.getByText('2 / 214 bagged')).toBeVisible();

  await page.getByRole('link', { name: 'Settings' }).click();

  // Export the backup JSON and check what it contains.
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

  // Reset requires the typed confirmation; drive it and verify the wipe.
  await expect(page.getByRole('button', { name: 'Reset progress' })).toBeDisabled();
  await page.getByLabel('Reset confirmation').fill('RESET');
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.getByText('Local progress has been reset.')).toBeVisible();
  expect(await readProgressStorage(page)).toEqual({});

  // Import the same file back and confirm.
  await page.getByLabel('Choose backup JSON').setInputFiles(backupPath);
  await expect(page.getByText('Ready to import 2 records, 2 bagged.')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm import' }).click();
  await expect(page.getByText('Imported 2 records, 2 bagged.')).toBeVisible();

  // State restored: storage matches the seed…
  const restored = await readProgressStorage(page);
  expect(Object.keys(restored).sort()).toEqual([ALLEN_CRAGS.id, ARD_CRAGS.id].sort());
  expect(restored[ALLEN_CRAGS.id]).toMatchObject({
    peakId: ALLEN_CRAGS.id,
    bagged: true,
    baggedDate: '2026-07-01',
  });
  expect(restored[ARD_CRAGS.id]).toMatchObject({
    peakId: ARD_CRAGS.id,
    bagged: true,
  });

  // …and the UI shows the restored stats again.
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page.getByText('2 / 214 bagged')).toBeVisible();
});
