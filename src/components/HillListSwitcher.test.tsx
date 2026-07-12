import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { usePreferencesStore } from '../store';
import { HillListSwitcher } from './HillListSwitcher';

vi.mock('../data/lists', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/lists')>();
  const wainwrights = actual.HILL_LISTS[0];

  if (!wainwrights) {
    throw new Error('Expected the registry to contain at least one list');
  }

  return {
    ...actual,
    HILL_LISTS: [
      wainwrights,
      {
        ...wainwrights,
        id: 'munros',
        name: 'Munros',
        regionLabel: 'Scottish Highlands',
        hasHillLighting: false,
      },
    ],
    isHillListId: (value: unknown) => value === 'wainwrights' || value === 'munros',
  };
});

describe('HillListSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    usePreferencesStore.getState().setActiveListId('wainwrights');
  });

  it('lists every registered hill list with the active one selected', () => {
    const { getByRole } = render(<HillListSwitcher />);

    const select = getByRole('combobox', { name: 'Hill list' });

    expect(select).toHaveValue('wainwrights');
    expect(getByRole('option', { name: 'Wainwrights' })).toBeInTheDocument();
    expect(getByRole('option', { name: 'Munros' })).toBeInTheDocument();
  });

  it('switches the active list preference', async () => {
    const user = userEvent.setup();
    const { getByRole } = render(<HillListSwitcher />);

    await user.selectOptions(getByRole('combobox', { name: 'Hill list' }), 'munros');

    expect(usePreferencesStore.getState().activeListId).toBe('munros');
  });
});
