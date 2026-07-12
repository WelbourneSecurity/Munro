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

const progress: PeakProgress[] = [
  { peakId: 'dobih-2', bagged: true, baggedDate: '2026-03-12' },
];

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

  it('shows a subtle bagged date on rows that have one', () => {
    const { getByRole } = render(
      <PeakListPanel
        peaks={peaks}
        progress={progress}
        selectedPeakId={undefined}
        onSelectPeak={vi.fn()}
      />,
    );

    expect(getByRole('button', { name: /Skiddaw/i })).toHaveTextContent('12 Mar 2026');
    expect(getByRole('button', { name: /Allen Crags/i })).not.toHaveTextContent(
      'Mar 2026',
    );
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

    expect(getByRole('group', { name: 'Filter peaks' })).toBeVisible();
    expect(getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(getByRole('button', { name: 'Bagged' }));

    expect(getByRole('button', { name: 'Bagged' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(getByText('Skiddaw')).toBeVisible();
    expect(queryByText('Allen Crags')).not.toBeInTheDocument();

    await user.clear(getByLabelText('Search peaks'));
    await user.type(getByLabelText('Search peaks'), 'allen');

    expect(getByText('No peaks match this view.')).toBeVisible();
  });

  it('keeps the focus ring visible on the active filter button', () => {
    const { getByRole } = render(
      <PeakListPanel
        peaks={peaks}
        progress={progress}
        selectedPeakId={undefined}
        onSelectPeak={vi.fn()}
      />,
    );

    // The active button's inset focus ring sits on the bagged fill, so it
    // must use the contrasting surface token, not bagged-on-bagged.
    const active = getByRole('button', { name: 'All' });
    expect(active.className).toContain('focus-visible:outline-surface');
    expect(active.className).not.toContain('focus-visible:outline-bagged');

    const inactive = getByRole('button', { name: 'Bagged' });
    expect(inactive.className).toContain('focus-visible:outline-bagged');
    expect(inactive.className).not.toContain('focus-visible:outline-surface');
  });
});

describe('PeakListPanel row windowing', () => {
  const manyPeaks: Peak[] = Array.from({ length: 300 }, (_, index) => ({
    id: `dobih-${String(index + 100)}`,
    dobihId: index + 100,
    name: `Summit ${String(index + 100).padStart(3, '0')}`,
    list: ['marilyns'],
    region: `Region ${String(index % 4)}`,
    heightM: 900 - index,
    lat: 55,
    lon: -3,
  }));

  function renderedRows(container: HTMLElement) {
    return container.querySelectorAll('li > button');
  }

  it('renders one window of rows and grows it on request', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = render(
      <PeakListPanel
        peaks={manyPeaks}
        progress={[]}
        selectedPeakId={undefined}
        onSelectPeak={vi.fn()}
      />,
    );

    expect(renderedRows(container)).toHaveLength(120);

    await user.click(getByRole('button', { name: 'Show 180 more' }));

    expect(renderedRows(container)).toHaveLength(240);
    expect(getByRole('button', { name: 'Show 60 more' })).toBeVisible();
  });

  it('resets the window when the search changes', async () => {
    const user = userEvent.setup();
    const { container, getByLabelText, getByRole } = render(
      <PeakListPanel
        peaks={manyPeaks}
        progress={[]}
        selectedPeakId={undefined}
        onSelectPeak={vi.fn()}
      />,
    );

    await user.click(getByRole('button', { name: 'Show 180 more' }));
    expect(renderedRows(container)).toHaveLength(240);

    await user.type(getByLabelText('Search peaks'), 'Summit');

    expect(renderedRows(container)).toHaveLength(120);
  });

  it('keeps a selected peak rendered beyond the window', () => {
    const lastPeak = manyPeaks.at(-1);
    const { getByText } = render(
      <PeakListPanel
        peaks={manyPeaks}
        progress={[]}
        selectedPeakId={lastPeak?.id}
        onSelectPeak={vi.fn()}
      />,
    );

    expect(getByText(lastPeak?.name ?? '')).toBeVisible();
  });
});
