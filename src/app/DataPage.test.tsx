import { render } from '@testing-library/react';

import {
  ATTRIBUTIONS,
  BASEMAP_ATTRIBUTION,
  BOUNDARY_ATTRIBUTION,
  DOBIH_ATTRIBUTION,
  TERRAIN_ATTRIBUTION,
} from '../data/attribution';
import { DataPage } from './DataPage';

describe('DataPage', () => {
  it('describes the supported list and its limitations', () => {
    const { getByRole, getByText } = render(<DataPage />);

    expect(getByRole('heading', { name: 'Data' })).toBeVisible();
    expect(getByText('Wainwrights')).toBeVisible();
    expect(getByText('214 fells')).toBeVisible();
    expect(getByText(/Munros, Corbetts and others — are planned/)).toBeVisible();
    expect(getByText(/summit points, not boundaries/)).toBeVisible();
    expect(getByText(/approximate\s+visual aids/)).toBeVisible();
    expect(getByText(/Natural England open\s+data/)).toBeVisible();
  });

  it('keeps the hill list description outside the definition list', () => {
    const { getByText } = render(<DataPage />);

    // The dl content model only allows dt/dd groups (or div wrappers), so the
    // descriptive paragraph must live alongside the list, not inside it.
    const description = getByText(/all within the Lake District National Park/);

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
