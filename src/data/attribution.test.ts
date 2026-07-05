import {
  BASEMAP_ATTRIBUTION,
  BOUNDARY_ATTRIBUTION,
  DOBIH_ATTRIBUTION,
  TERRAIN_ATTRIBUTION,
  mapAttributionHtml,
} from './attribution';

describe('attribution constants', () => {
  it('keeps required source names and licences visible', () => {
    expect(DOBIH_ATTRIBUTION.label).toContain(
      'Database of British and Irish Hills v18.4',
    );
    expect(DOBIH_ATTRIBUTION.label).toContain('CC BY 4.0');
    expect(BOUNDARY_ATTRIBUTION.label).toContain('OGL v3');
    expect(BASEMAP_ATTRIBUTION.label).toContain('OpenFreeMap');
    expect(TERRAIN_ATTRIBUTION.label).toContain('Terrain');
  });

  it('renders reusable map attribution links', () => {
    const html = mapAttributionHtml();

    expect(html).toContain('https://openfreemap.org/');
    expect(html).toContain('https://registry.opendata.aws/terrain-tiles/');
    expect(html).toContain('https://www.hill-bagging.co.uk/dobih');
  });
});
