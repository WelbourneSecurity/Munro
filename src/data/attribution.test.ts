import {
  BASEMAP_ATTRIBUTION,
  BOUNDARY_ATTRIBUTION,
  DOBIH_ATTRIBUTION,
  DOBIH_SOURCE,
  TERRAIN_ATTRIBUTION,
  mapAttributionHtml,
} from './attribution';
import wainwrights from './wainwrights.json';

describe('attribution constants', () => {
  it('keeps required source names and licences visible', () => {
    expect(DOBIH_ATTRIBUTION.label).toContain('Database of British and Irish Hills v');
    expect(DOBIH_ATTRIBUTION.label).toContain('CC BY 4.0');
    expect(BOUNDARY_ATTRIBUTION.label).toContain('OGL v3');
    expect(BASEMAP_ATTRIBUTION.label).toContain('OpenFreeMap');
    expect(TERRAIN_ATTRIBUTION.label).toContain('Terrain');
  });

  it('derives the licence line from the source string stamped into the data', () => {
    // Single source of truth: the committed peak data's metadata and the
    // attribution drawn into exported images must name the same DoBIH
    // release — a data refresh cannot desynchronise the licence line.
    expect(DOBIH_ATTRIBUTION.label).toContain(DOBIH_SOURCE);
    expect(wainwrights.metadata.source).toBe(DOBIH_SOURCE);
  });

  it('renders reusable map attribution links', () => {
    const html = mapAttributionHtml();

    expect(html).toContain('https://openfreemap.org/');
    expect(html).toContain('https://registry.opendata.aws/terrain-tiles/');
    expect(html).toContain('https://www.hill-bagging.co.uk/dobih');
  });
});
