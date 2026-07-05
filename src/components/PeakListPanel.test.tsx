import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { Peak, PeakProgress } from '../domain';
import { PeakListPanel } from './PeakListPanel';

const peaks: Peak[] = [
  {
    id: 'dobih-1',
    dobihId: 1,
    name: 'Allen Crags',
    list: ['wainwrights'],
    region: 'Lake District - Southern Fells',
    nationalPark: 'Lake District',
    heightM: 785,
    lat: 54.48,
    lon: -3.18,
  },
  {
    id: 'dobih-2',
    dobihId: 2,
    name: 'Skiddaw',
    list: ['wainwrights'],
    region: 'Lake District - Northern Fells',
    nationalPark: 'Lake District',
    heightM: 930.4,
    lat: 54.65,
    lon: -3.14,
    gridRef: 'NY260290',
  },
];

const progress: PeakProgress[] = [{ peakId: 'dobih-2', bagged: true }];

describe('PeakListPanel', () => {
  it('renders peak groups and selects a row', async () => {
    const onSelectPeak = vi.fn();
    const user = userEvent.setup();
    const { getByRole, getByText } = render(
      <PeakListPanel
        peaks={peaks}
        progress={progress}
        selectedPeakId="dobih-1"
        onSelectPeak={onSelectPeak}
      />,
    );

    expect(getByText('Southern Fells')).toBeVisible();
    expect(getByText('Allen Crags')).toBeVisible();

    await user.click(getByRole('button', { name: /Skiddaw/i }));

    expect(onSelectPeak).toHaveBeenCalledWith('dobih-2');
  });

  it('filters by bagged state and search text', async () => {
    const user = userEvent.setup();
    const { getByLabelText, getByRole, queryByText, getByText } = render(
      <PeakListPanel
        peaks={peaks}
        progress={progress}
        selectedPeakId={undefined}
        onSelectPeak={vi.fn()}
      />,
    );

    await user.click(getByRole('button', { name: 'Bagged' }));

    expect(getByText('Skiddaw')).toBeVisible();
    expect(queryByText('Allen Crags')).not.toBeInTheDocument();

    await user.clear(getByLabelText('Search peaks'));
    await user.type(getByLabelText('Search peaks'), 'allen');

    expect(getByText('No peaks match this view.')).toBeVisible();
  });
});
