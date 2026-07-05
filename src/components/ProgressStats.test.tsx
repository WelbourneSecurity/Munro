import { render } from '@testing-library/react';

import { ProgressStats } from './ProgressStats';

describe('ProgressStats', () => {
  it('renders the progress count, percentage and remaining copy', () => {
    const { getByText } = render(
      <ProgressStats
        stats={{
          total: 214,
          bagged: 37,
          remaining: 177,
          percentage: 17,
          recent: [],
        }}
      />,
    );

    expect(getByText('37 / 214 bagged')).toBeVisible();
    expect(getByText('17%')).toBeVisible();
    expect(
      getByText('177 remaining. Progress is stored locally in this browser.'),
    ).toBeVisible();
  });
});
