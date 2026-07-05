import { useState } from 'react';

import { parseBackup, type Backup } from '../domain';
import { usePreferencesStore, useProgressStore } from '../store';

function backupFileName() {
  return `munro-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

function describeBackup(backup: Backup) {
  const bagged = backup.progress.filter((record) => record.bagged).length;
  return `${String(backup.progress.length)} records, ${String(bagged)} bagged`;
}

export function SettingsPage() {
  const exportProgress = useProgressStore((state) => state.exportProgress);
  const importProgress = useProgressStore((state) => state.importProgress);
  const resetAll = useProgressStore((state) => state.resetAll);
  const terrainEnabled = usePreferencesStore((state) => state.terrainEnabled);
  const setTerrainEnabled = usePreferencesStore((state) => state.setTerrainEnabled);
  const [pendingBackup, setPendingBackup] = useState<Backup>();
  const [importMessage, setImportMessage] = useState('');
  const [resetText, setResetText] = useState('');

  function handleExport() {
    const backup = exportProgress();
    const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName();
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File | undefined) {
    setPendingBackup(undefined);

    if (!file) {
      return;
    }

    try {
      const backup = parseBackup(JSON.parse(await file.text()));
      setPendingBackup(backup);
      setImportMessage(`Ready to import ${describeBackup(backup)}.`);
    } catch {
      setImportMessage('Import failed. Choose a valid Munro backup JSON file.');
    }
  }

  function handleConfirmImport() {
    if (!pendingBackup) {
      return;
    }

    importProgress(pendingBackup);
    setImportMessage(`Imported ${describeBackup(pendingBackup)}.`);
    setPendingBackup(undefined);
  }

  function handleReset() {
    if (resetText !== 'RESET') {
      return;
    }

    resetAll();
    setResetText('');
    setImportMessage('Local progress has been reset.');
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-label text-label text-muted">Local record</p>
      <h1 className="text-primary mt-2 text-3xl font-semibold">Settings</h1>
      <p className="text-secondary mt-4 max-w-2xl text-sm leading-6">
        Your progress stays in this browser. Export a backup before clearing or moving
        devices.
      </p>

      <div className="mt-8 space-y-6">
        <section className="border-line bg-panel border p-5">
          <h2 className="text-primary text-xl font-semibold">Backup</h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Download a JSON backup of your local progress.
          </p>
          <button
            className="border-line bg-bagged text-surface mt-4 min-h-11 border px-4 text-sm font-semibold"
            type="button"
            onClick={handleExport}
          >
            Export progress
          </button>
        </section>

        <section className="border-line bg-panel border p-5">
          <h2 className="text-primary text-xl font-semibold">Restore</h2>
          <label className="text-secondary mt-4 block text-sm">
            Choose backup JSON
            <input
              className="border-line bg-surface text-secondary mt-2 block w-full border px-3 py-3 text-sm"
              accept="application/json,.json"
              type="file"
              onChange={(event) => {
                void handleImportFile(event.currentTarget.files?.[0]);
              }}
            />
          </label>
          {importMessage ? (
            <p className="text-muted mt-3 text-sm leading-6">{importMessage}</p>
          ) : null}
          <button
            className="border-line bg-surface text-primary disabled:text-muted mt-4 min-h-11 border px-4 text-sm font-semibold disabled:cursor-not-allowed"
            disabled={!pendingBackup}
            type="button"
            onClick={handleConfirmImport}
          >
            Confirm import
          </button>
        </section>

        <section className="border-line bg-panel border p-5">
          <h2 className="text-primary text-xl font-semibold">Preferences</h2>
          <label className="text-secondary mt-4 flex min-h-11 items-center justify-between gap-4 text-sm">
            Terrain and contours
            <input
              checked={terrainEnabled}
              className="accent-bagged h-5 w-5"
              type="checkbox"
              onChange={(event) => {
                setTerrainEnabled(event.currentTarget.checked);
              }}
            />
          </label>
        </section>

        <section className="border-line bg-panel border p-5">
          <h2 className="text-primary text-xl font-semibold">Reset local progress</h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Type RESET to clear every local progress record in this browser.
          </p>
          <label className="sr-only" htmlFor="reset-confirmation">
            Reset confirmation
          </label>
          <input
            id="reset-confirmation"
            className="border-line bg-surface text-primary mt-4 min-h-11 w-full border px-3 text-sm"
            value={resetText}
            onChange={(event) => {
              setResetText(event.currentTarget.value);
            }}
          />
          <button
            className="border-line bg-surface text-primary disabled:text-muted mt-4 min-h-11 border px-4 text-sm font-semibold disabled:cursor-not-allowed"
            disabled={resetText !== 'RESET'}
            type="button"
            onClick={handleReset}
          >
            Reset progress
          </button>
        </section>
      </div>
    </section>
  );
}
