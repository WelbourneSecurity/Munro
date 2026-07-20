import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BACKUP_VERSION, usePreferencesStore, useProgressStore } from '../store';
import { SettingsPage } from './SettingsPage';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.getState().resetAll();
  usePreferencesStore.getState().setTerrainEnabled(true);
  usePreferencesStore.getState().setSummitDetectionEnabled(false);
  usePreferencesStore.getState().setVisualPreset('midnight');
});

describe('SettingsPage', () => {
  it('previews and imports a valid backup atomically', async () => {
    const user = userEvent.setup();
    const { getByLabelText, getByRole, getByText } = render(<SettingsPage />);
    const backup = {
      version: BACKUP_VERSION,
      exportedAt: '2026-07-05T12:00:00.000Z',
      progress: [{ peakId: 'dobih-2319', bagged: true }],
    };
    const file = new File([JSON.stringify(backup)], 'backup.json', {
      type: 'application/json',
    });

    await user.upload(getByLabelText('Choose backup JSON'), file);

    expect(getByText('Ready to import 1 records, 1 bagged.')).toBeVisible();
    // The outcome message lives in a polite live region so it is announced.
    expect(getByRole('status')).toHaveTextContent(
      'Ready to import 1 records, 1 bagged.',
    );

    await user.click(getByRole('button', { name: 'Confirm import' }));

    expect(useProgressStore.getState().progressByPeakId['dobih-2319']).toEqual({
      peakId: 'dobih-2319',
      bagged: true,
    });
    expect(getByText('Imported 1 records, 1 bagged.')).toBeVisible();
  });

  it('reports the deduplicated count when a backup repeats a peak id', async () => {
    const user = userEvent.setup();
    const { getByLabelText, getByRole, getByText } = render(<SettingsPage />);
    // A hand-merged backup (two devices' files concatenated) can repeat a
    // peak id; the import keeps the last record, so the announcement must
    // count what actually survives — not the raw array length.
    const backup = {
      version: BACKUP_VERSION,
      exportedAt: '2026-07-05T12:00:00.000Z',
      progress: [
        { peakId: 'dobih-2319', bagged: true, notes: 'First device' },
        { peakId: 'dobih-0010', bagged: true },
        { peakId: 'dobih-2319', bagged: false },
      ],
    };
    const file = new File([JSON.stringify(backup)], 'backup.json', {
      type: 'application/json',
    });

    await user.upload(getByLabelText('Choose backup JSON'), file);

    expect(getByText('Ready to import 2 records, 1 bagged.')).toBeVisible();

    await user.click(getByRole('button', { name: 'Confirm import' }));

    expect(getByText('Imported 2 records, 1 bagged.')).toBeVisible();
    expect(useProgressStore.getState().progressByPeakId).toEqual({
      'dobih-0010': { peakId: 'dobih-0010', bagged: true },
      'dobih-2319': { peakId: 'dobih-2319', bagged: false },
    });
  });

  it('rejects malformed imports with a plain message', async () => {
    const user = userEvent.setup();
    const { getByLabelText, getByRole, getByText } = render(<SettingsPage />);
    const file = new File(['{"version":"bad"}'], 'backup.json', {
      type: 'application/json',
    });

    await user.upload(getByLabelText('Choose backup JSON'), file);

    expect(
      getByText('Import failed. Choose a valid Munro backup JSON file.'),
    ).toBeVisible();
    expect(getByRole('button', { name: 'Confirm import' })).toBeDisabled();
  });

  it('clears the file input so re-selecting the same file parses again', async () => {
    const user = userEvent.setup();
    const { getByLabelText, getByText } = render(<SettingsPage />);
    const input = getByLabelText('Choose backup JSON') as HTMLInputElement;
    const malformed = new File(['not json'], 'munro-backup-2026-07-12.json', {
      type: 'application/json',
    });

    await user.upload(input, malformed);

    expect(
      getByText('Import failed. Choose a valid Munro backup JSON file.'),
    ).toBeVisible();
    // The input must clear after every pick — browsers only fire change when
    // the value changes, so a kept value dead-ends fixing and re-selecting
    // the same file.
    expect(input.value).toBe('');

    const fixed = new File(
      [
        JSON.stringify({
          version: BACKUP_VERSION,
          exportedAt: '2026-07-05T12:00:00.000Z',
          progress: [{ peakId: 'dobih-2319', bagged: true }],
        }),
      ],
      'munro-backup-2026-07-12.json',
      { type: 'application/json' },
    );

    await user.upload(input, fixed);

    expect(getByText('Ready to import 1 records, 1 bagged.')).toBeVisible();
    expect(input.value).toBe('');
  });

  it('requires explicit reset confirmation', async () => {
    const user = userEvent.setup();
    useProgressStore.getState().bag('dobih-2319');

    const { getByLabelText, getByRole, getByText } = render(<SettingsPage />);
    const resetButton = getByRole('button', { name: 'Reset progress' });

    expect(resetButton).toBeDisabled();

    await user.type(getByLabelText('Reset confirmation'), 'RESET');
    await user.click(resetButton);

    expect(useProgressStore.getState().progressByPeakId).toEqual({});
    expect(getByText('Local progress has been reset.')).toBeVisible();
  });

  it('toggles terrain preference', async () => {
    const user = userEvent.setup();
    const { getByLabelText } = render(<SettingsPage />);

    await user.click(getByLabelText('Terrain and contours'));

    await waitFor(() => {
      expect(usePreferencesStore.getState().terrainEnabled).toBe(false);
    });
  });

  it('selects and persists a curated visual mode without a dropdown', async () => {
    const user = userEvent.setup();
    const { getByRole, queryByRole } = render(<SettingsPage />);

    expect(queryByRole('combobox', { name: /appearance/i })).not.toBeInTheDocument();
    await user.click(getByRole('radio', { name: /Nature/ }));

    expect(usePreferencesStore.getState().visualPreset).toBe('nature');
    expect(getByRole('radio', { name: /Nature/ })).toBeChecked();
  });

  it('shows the summit detection toggle unchecked with a plain explanation', () => {
    const { getByLabelText, getByText } = render(<SettingsPage />);

    expect(getByLabelText('Summit detection')).not.toBeChecked();
    expect(getByText(/never stored or sent anywhere/i, { exact: false })).toBeVisible();
  });

  it('toggles summit detection preference', async () => {
    const user = userEvent.setup();
    const { getByLabelText } = render(<SettingsPage />);

    await user.click(getByLabelText('Summit detection'));

    await waitFor(() => {
      expect(usePreferencesStore.getState().summitDetectionEnabled).toBe(true);
    });
  });

  it('explains a hard permission denial quietly', () => {
    const { getByText } = render(<SettingsPage summitDetectionStatus="denied" />);

    expect(
      getByText(/Location permission was denied/i, { exact: false }),
    ).toBeVisible();
  });

  it('explains when location is unavailable', () => {
    const { getByText } = render(<SettingsPage summitDetectionStatus="unavailable" />);

    expect(getByText(/Location is not available/i, { exact: false })).toBeVisible();
  });
});
