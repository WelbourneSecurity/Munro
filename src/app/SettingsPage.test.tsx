import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BACKUP_VERSION, usePreferencesStore, useProgressStore } from '../store';
import { SettingsPage } from './SettingsPage';

beforeEach(() => {
  localStorage.clear();
  useProgressStore.getState().resetAll();
  usePreferencesStore.getState().setTerrainEnabled(true);
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
});
