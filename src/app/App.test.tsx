import { act, render } from '@testing-library/react';
import { vi } from 'vitest';

import { useProgressStore } from '../store';
import { App } from './App';

vi.mock('../map', () => ({
  MapView: () => <main aria-label="Munro tracker">Munro map</main>,
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetAll();
    history.replaceState(null, '', '/');
  });

  it('renders the Munro tracker shell', () => {
    const { getByRole } = render(<App />);

    expect(getByRole('main', { name: 'Munro tracker' })).toBeVisible();
    expect(getByRole('link', { name: 'Tracker' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('renders hash route stubs', () => {
    history.replaceState(null, '', '/#/data');

    const { getByRole } = render(<App />);

    expect(getByRole('heading', { name: 'Data' })).toBeVisible();
    expect(getByRole('link', { name: 'Data' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders the home page with empty progress', async () => {
    history.replaceState(null, '', '/#/');

    const { findByText, getByRole } = render(<App />);

    expect(
      getByRole('heading', {
        name: 'A clean, map-first hiking tracker for UK peak bagging.',
      }),
    ).toBeVisible();
    // The empty-state copy waits for the peak data to load — until then the
    // page cannot say anything truthful about progress.
    expect(
      await findByText('Start bagging to build your local progress record.'),
    ).toBeVisible();
    expect(getByRole('link', { name: 'Open tracker' })).toHaveAttribute(
      'href',
      '#/tracker',
    );
  });

  it('renders home progress for the active hill list when records exist', async () => {
    history.replaceState(null, '', '/#/');
    useProgressStore.getState().bag('dobih-2319');

    const { findByText } = render(<App />);

    expect(await findByText('1 / 2170 bagged')).toBeVisible();
  });

  it('resets scroll when the route changes, but not on same-route hash changes', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    render(<App />);

    // Initial render leaves the browser's own scroll restoration alone.
    expect(scrollTo).not.toHaveBeenCalled();

    act(() => {
      history.replaceState(null, '', '/#/data');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);

    // A hash change resolving to the same route stays inert.
    act(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(scrollTo).toHaveBeenCalledTimes(1);

    scrollTo.mockRestore();
  });
});
