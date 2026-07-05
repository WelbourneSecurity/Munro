import { peaksToGeoJSON } from './geojson';
import type { Peak, PeakProgress } from './schemas';

const peaks: Peak[] = [
  {
    id: 'dobih-2319',
    dobihId: 2319,
    name: 'Skiddaw',
    list: ['wainwrights'],
    region: 'Lake District - Northern Fells',
    nationalPark: 'Lake District',
    heightM: 930.4,
    heightFt: 3052,
    lat: 54.651391,
    lon: -3.147761,
    gridRef: 'NY260290',
    source: 'Database of British and Irish Hills v18.4',
  },
  {
    id: 'dobih-2536',
    dobihId: 2536,
    name: 'Castle Crag',
    list: ['wainwrights'],
    region: 'Lake District - Central Fells',
    nationalPark: 'Lake District',
    heightM: 290,
    heightFt: 951,
    lat: 54.52801,
    lon: -3.15575,
    gridRef: 'NY249159',
    source: 'Database of British and Irish Hills v18.4',
  },
];

const progress: PeakProgress[] = [{ peakId: 'dobih-2319', bagged: true }];

describe('peaksToGeoJSON', () => {
  it('builds point features in lon/lat order with bagged state', () => {
    const geojson = peaksToGeoJSON(peaks, progress);

    expect(geojson.features).toHaveLength(2);
    expect(geojson.features[0]?.geometry.coordinates).toEqual([-3.147761, 54.651391]);
    expect(geojson.features[0]?.properties.bagged).toBe(true);
    expect(geojson.features[1]?.properties.bagged).toBe(false);
  });
});
