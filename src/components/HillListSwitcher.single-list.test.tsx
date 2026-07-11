import { render } from '@testing-library/react';

import { HILL_LISTS } from '../data/lists';
import { HillListSwitcher } from './HillListSwitcher';

// Deliberately unmocked: this exercises the real registry. While only one
// list ships, the switcher must render nothing at all — a one-option
// dropdown is exactly the kind of chrome the product rules out.
describe('HillListSwitcher against the real registry', () => {
  it('renders nothing while fewer than two lists are registered', () => {
    // When a second list ships this precondition fails; replace this test
    // with real-registry coverage of the rendered switcher.
    expect(HILL_LISTS.length).toBeLessThan(2);

    const { container } = render(<HillListSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });
});
