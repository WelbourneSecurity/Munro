import { render } from '@testing-library/react';
import { ProgressStats } from './ProgressStats';

describe('ProgressStats', () => {
  it('renders large tabular progress with a polite live region', () => {
    const { getByText } = render(
      <ProgressStats
        label="Wainwrights bagged"
        stats={{ total: 214, bagged: 37, remaining: 177, percentage: 17, recent: [] }}
      />,
    );
    expect(getByText('Wainwrights bagged')).toBeVisible();
    expect(getByText('37').closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(getByText('/ 214')).toBeVisible();
    expect(getByText('177 hills remain')).toBeVisible();
    expect(getByText('17%')).toBeVisible();
  });
});
