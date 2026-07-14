import { render } from '@testing-library/react';

import {
  ATTRIBUTIONS,
  BASEMAP_ATTRIBUTION,
  BOUNDARY_ATTRIBUTION,
  DOBIH_ATTRIBUTION,
  TERRAIN_ATTRIBUTION,
} from '../data/attribution';
import { HILL_LISTS } from '../data/lists';
import { DataPage } from './DataPage';

describe('DataPage', () => {
  it('describes every registered list and the data limitations', () => {
    const { getAllByText, getByRole, getByText } = render(<DataPage />);

    expect(getByRole('heading', { name: 'Data' })).toBeVisible();

    // Every registry entry appears — a new list must surface here without a
    // page edit. ("All peaks" also appears in the collated-view paragraph,
    // hence getAllByText.)
    for (const list of HILL_LISTS) {
      const [entry] = getAllByText(list.name);
      expect(entry).toBeVisible();
    }

    expect(getByText(/one record per distinct hill/)).toBeVisible();
    expect(getByText(/summit points, not boundaries/)).toBeVisible();
    expect(getByText(/approximate visual aids/)).toBeVisible();
    expect(getByText(/Natural England open\s+data/)).toBeVisible();
  });

  it('keeps the collated-view description outside the definition list', () => {
    const { getByText } = render(<DataPage />);

    // The dl content model only allows dt/dd groups (or div wrappers), so the
    // descriptive paragraph must live alongside the list, not inside it.
    const description = getByText(/one record per distinct hill/);

    expect(description.tagName).toBe('P');
    expect(description.closest('dl')).toBeNull();
    expect(getByText('Wainwrights').closest('dl')).not.toBeNull();
  });

  it('renders every exported attribution constant from src/data/attribution.ts', () => {
    const { getByRole } = render(<DataPage />);

    // Each individually exported constant must appear on the page verbatim.
    for (const attribution of [
      DOBIH_ATTRIBUTION,
      BOUNDARY_ATTRIBUTION,
      BASEMAP_ATTRIBUTION,
      TERRAIN_ATTRIBUTION,
    ]) {
      const link = getByRole('link', { name: attribution.label });

      expect(link).toBeVisible();
      expect(link).toHaveAttribute('href', attribution.url);
    }
  });

  it('covers the full ATTRIBUTIONS collection', () => {
    const { getByRole } = render(<DataPage />);

    for (const attribution of ATTRIBUTIONS) {
      expect(getByRole('link', { name: attribution.label })).toBeVisible();
    }
  });
});
