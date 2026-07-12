import { render } from '@testing-library/react';
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

  it('renders the home page with empty progress', () => {
    history.replaceState(null, '', '/#/');

    const { getByRole, getByText } = render(<App />);

    expect(
      getByRole('heading', {
        name: 'A clean, map-first hiking tracker for UK peak bagging.',
      }),
    ).toBeVisible();
    expect(
      getByText('Start bagging to build your local progress record.'),
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
});
