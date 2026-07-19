import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';

import type { Peak } from '../domain';
import { PeakAtlas } from './PeakAtlas';

const peaks: Peak[] = [
  {
    id: 'a',
    dobihId: 1,
    name: 'Alpha Fell',
    list: ['W'],
    region: 'Lake District - Eastern Fells',
    heightM: 700,
    lat: 54.5,
    lon: -3,
  },
  {
    id: 'b',
    dobihId: 2,
    name: 'Beta Fell',
    list: ['W'],
    region: 'Lake District - Central Fells',
    heightM: 650,
    lat: 54.6,
    lon: -3.1,
  },
];

describe('PeakAtlas', () => {
  it('groups regions and selects without silently changing progress', () => {
    const onSelectPeak = vi.fn();
    const { getByRole, getByText } = render(
      <PeakAtlas
        peaks={peaks}
        progress={[{ peakId: 'a', bagged: true, baggedDate: '2026-07-19' }]}
        selectedPeakId={undefined}
        regionPrefixToHide="Lake District - "
        onSelectPeak={onSelectPeak}
      />,
    );
    expect(getByText('Eastern Fells')).toBeVisible();
    expect(
      getByRole('button', { name: 'Alpha Fell, 700 metres, bagged' }),
    ).toHaveTextContent('19 Jul 2026');
    fireEvent.click(getByRole('button', { name: 'Beta Fell, 650 metres, open' }));
    expect(onSelectPeak).toHaveBeenCalledWith('b');
  });
});
