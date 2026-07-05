import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import boundaryRaw from '../data/boundaries/lake-district.geojson?raw';
import wainwrightAreasRaw from '../data/boundaries/wainwright-areas.geojson?raw';
import wainwrights from '../data/wainwrights.json';
import { peakSchema, type Peak } from './schemas';

const boundary = JSON.parse(boundaryRaw) as unknown;
const wainwrightAreas = JSON.parse(wainwrightAreasRaw) as unknown;

const LAKE_DISTRICT_BOUNDS = {
  minLat: 54.0,
  maxLat: 55.0,
  minLon: -3.6,
  maxLon: -2.4,
};

function expectWithinLakeDistrictBounds(peak: Peak) {
  expect(peak.lat, `${peak.name} latitude`).toBeGreaterThanOrEqual(
    LAKE_DISTRICT_BOUNDS.minLat,
  );
  expect(peak.lat, `${peak.name} latitude`).toBeLessThanOrEqual(
    LAKE_DISTRICT_BOUNDS.maxLat,
  );
  expect(peak.lon, `${peak.name} longitude`).toBeGreaterThanOrEqual(
    LAKE_DISTRICT_BOUNDS.minLon,
  );
  expect(peak.lon, `${peak.name} longitude`).toBeLessThanOrEqual(
    LAKE_DISTRICT_BOUNDS.maxLon,
  );
}

function collectPolygonPairs(coordinates: Polygon['coordinates']): [number, number][] {
  return coordinates.flatMap((ring) =>
    ring.map((position) => {
      const lon = position[0];
      const lat = position[1];

      if (lon === undefined || lat === undefined) {
        throw new Error('Boundary coordinate missing lon/lat values.');
      }

      return [lon, lat] satisfies [number, number];
    }),
  );
}

function collectAreaPairs(geometry: Polygon | MultiPolygon): [number, number][] {
  if (geometry.type === 'Polygon') {
    return collectPolygonPairs(geometry.coordinates);
  }

  return geometry.coordinates.flatMap((polygon) => collectPolygonPairs(polygon));
}

describe('committed Wainwrights data', () => {
  const peaks = wainwrights.peaks;

  it('contains the exact Wainwright count from DoBIH', () => {
    expect(wainwrights.metadata.source).toBe(
      'Database of British and Irish Hills v18.4',
    );
    expect(peaks).toHaveLength(214);
  });

  it('validates every peak and keeps ids unique', () => {
    const ids = new Set<string>();
    const dobihIds = new Set<number>();

    for (const peak of peaks) {
      const parsed = peakSchema.parse(peak);

      expect(ids.has(parsed.id), `${parsed.name} duplicate id`).toBe(false);
      expect(dobihIds.has(parsed.dobihId), `${parsed.name} duplicate DoBIH id`).toBe(
        false,
      );

      ids.add(parsed.id);
      dobihIds.add(parsed.dobihId);
      expectWithinLakeDistrictBounds(parsed);
      expect(parsed.heightM, `${parsed.name} height`).toBeGreaterThanOrEqual(290);
      expect(parsed.heightM, `${parsed.name} height`).toBeLessThanOrEqual(980);
    }
  });

  it('passes key Wainwright spot checks against DoBIH v18.4', () => {
    const skiddaw = peaks.find((peak) => peak.dobihId === 2319);
    const highest = [...peaks].sort((a, b) => b.heightM - a.heightM)[0];
    const lowest = [...peaks].sort((a, b) => a.heightM - b.heightM)[0];

    expect(skiddaw).toMatchObject({
      name: 'Skiddaw',
      heightM: 930.4,
      lat: 54.651391,
      lon: -3.147761,
    });
    expect(highest?.name).toBe('Scafell Pike');
    expect(lowest?.name).toBe('Castle Crag');
  });
});

describe('committed Lake District boundary', () => {
  const geojson = boundary as FeatureCollection<Polygon>;

  it('is a single WGS84 polygon', () => {
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(1);
    expect(geojson.features[0]?.geometry.type).toBe('Polygon');
  });

  it('has valid lon/lat coordinates in the Lake District area', () => {
    const feature = geojson.features[0];
    expect(feature).toBeDefined();

    if (!feature) {
      throw new Error('Boundary feature missing.');
    }

    const pairs = collectPolygonPairs(feature.geometry.coordinates);
    expect(pairs.length).toBeGreaterThan(100);

    for (const [lon, lat] of pairs) {
      expect(lon).toBeGreaterThanOrEqual(-4);
      expect(lon).toBeLessThanOrEqual(-2);
      expect(lat).toBeGreaterThanOrEqual(54);
      expect(lat).toBeLessThanOrEqual(55.2);
    }
  });
});

describe('committed Wainwright area model', () => {
  type AreaFeatureCollection = FeatureCollection<
    Polygon | MultiPolygon,
    {
      id: string;
      dobihId: number;
      name: string;
      region: string;
      method: string;
      profile?: {
        baseRadiusKm?: number;
        sampleStepDegrees?: number;
        neighbourInfluenceDegrees?: number;
      };
    }
  > & {
    metadata?: {
      count?: number;
      method?: string;
    };
  };

  const geojson = wainwrightAreas as AreaFeatureCollection;

  it('contains one generated area for every Wainwright peak', () => {
    const peakIds = new Set(wainwrights.peaks.map((peak) => peak.id));
    const areaIds = new Set(geojson.features.map((feature) => feature.properties.id));

    expect(geojson.metadata?.count).toBe(214);
    expect(geojson.features).toHaveLength(214);
    expect(areaIds).toEqual(peakIds);
  });

  it('keeps method provenance on every feature', () => {
    for (const feature of geojson.features) {
      expect(feature.properties.method).toBe('summit-centred-hill-profile');
      expect(feature.properties.name).toBeTruthy();
      expect(feature.properties.dobihId).toBeGreaterThan(0);
      expect(feature.properties.profile?.baseRadiusKm).toBeGreaterThan(0);
      expect(feature.properties.profile?.sampleStepDegrees).toBe(5);
      expect(feature.properties.profile?.neighbourInfluenceDegrees).toBe(78);
    }
  });

  it('has polygon coordinates in the Lake District area', () => {
    for (const feature of geojson.features) {
      expect(['Polygon', 'MultiPolygon']).toContain(feature.geometry.type);

      const pairs = collectAreaPairs(feature.geometry);
      expect(pairs.length, feature.properties.name).toBeGreaterThan(3);

      for (const [lon, lat] of pairs) {
        expect(lon).toBeGreaterThanOrEqual(-4);
        expect(lon).toBeLessThanOrEqual(-2);
        expect(lat).toBeGreaterThanOrEqual(54);
        expect(lat).toBeLessThanOrEqual(55.2);
      }
    }
  });
});
