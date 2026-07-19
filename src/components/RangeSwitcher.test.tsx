import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { buildRangeEdition, type Peak } from '../domain';
import { RangeSwitcher } from './RangeSwitcher';

const peaks: Peak[] = [
  {
    id: 'dobih-1',
    dobihId: 1,
    name: 'Cairn Gorm',
    list: ['munros'],
    region: 'Cairngorms',
    heightM: 1245,
    lat: 57.1168,
    lon: -3.6444,
  },
];

describe('RangeSwitcher', () => {
  it('opens an editorial range index and switches without a select element', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { getByRole, queryByRole } = render(
      <RangeSwitcher
        active={buildRangeEdition('uk', peaks)}
        allPeaks={peaks}
        onChange={onChange}
      />,
    );

    expect(queryByRole('combobox')).not.toBeInTheDocument();
    await user.click(getByRole('button', { name: 'Change range, United Kingdom' }));
    expect(getByRole('dialog', { name: 'Choose a range.' })).toBeVisible();
    await user.click(getByRole('button', { name: /Scotland/ }));
    expect(onChange).toHaveBeenCalledWith('scotland');
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });
});
