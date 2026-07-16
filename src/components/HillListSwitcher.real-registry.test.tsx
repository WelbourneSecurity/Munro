import { render } from '@testing-library/react';

import { HILL_LISTS } from '../data/lists';
import { usePreferencesStore } from '../store';
import { HillListSwitcher } from './HillListSwitcher';

// Deliberately unmocked: this exercises the real registry. With several
// lists shipped, the switcher must surface each one without code changes.
describe('HillListSwitcher against the real registry', () => {
  beforeEach(() => {
    localStorage.clear();
    usePreferencesStore.getState().setActiveListId('wainwrights');
  });

  it('renders one option per registered list, with the collated view first', () => {
    const { getByRole, getAllByRole } = render(<HillListSwitcher />);

    const select = getByRole('combobox', { name: 'Hill list' });
    const options = getAllByRole('option');

    expect(select).toHaveValue('wainwrights');
    expect(options.map((option) => option.textContent)).toEqual(
      HILL_LISTS.map((list) => list.name),
    );
    expect(options.map((option) => option.textContent)).toEqual([
      'All peaks',
      'Wainwrights',
      'Munros',
      'Corbetts',
      'Grahams',
      'Donalds',
      'Ethels',
      'Hewitts',
      'Marilyns',
    ]);
  });
});
