import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import boundaryRaw from '../data/boundaries/lake-district.geojson?raw';
import wainwrightAreasRaw from '../data/boundaries/wainwright-areas.geojson?raw';
import corbetts from '../data/corbetts.json';
import donalds from '../data/donalds.json';
import grahams from '../data/grahams.json';
import munros from '../data/munros.json';
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

interface PeakDataFile {
  metadata: { source: string; license: string; changes: string; count: number };
  peaks: Peak[];
}

interface ScottishListCase {
  id: string;
  file: PeakDataFile;
  count: number;
  /** Inclusive summit-height band from the list definition. */
  heightRangeM: [number, number];
  /** `[[west, south], [east, north]]` in WGS84. */
  bounds: [[number, number], [number, number]];
}

const scottishLists: ScottishListCase[] = [
  {
    id: 'munros',
    file: munros,
    count: 282,
    heightRangeM: [914, 1345],
    bounds: [
      [-6.6, 56.0],
      [-2.7, 58.7],
    ],
  },
  {
    id: 'corbetts',
    file: corbetts,
    count: 222,
    heightRangeM: [762, 915],
    bounds: [
      [-7.1, 54.95],
      [-2.5, 58.75],
    ],
  },
  {
    id: 'grahams',
    file: grahams,
    count: 231,
    heightRangeM: [600, 762],
    bounds: [
      [-7.6, 54.8],
      [-2.5, 58.6],
    ],
  },
  {
    id: 'donalds',
    file: donalds,
    count: 89,
    heightRangeM: [609, 844],
    bounds: [
      [-4.85, 54.8],
      [-2.0, 56.5],
    ],
  },
];

describe.each(scottishLists)(
  'committed $id data',
  ({ id, file, count, heightRangeM, bounds }) => {
    const peaks = file.peaks;
    const [minHeightM, maxHeightM] = heightRangeM;
    const [[west, south], [east, north]] = bounds;

    it('records DoBIH provenance and the published count', () => {
      expect(file.metadata.source).toBe('Database of British and Irish Hills v18.4');
      expect(file.metadata.license).toBe('CC BY 4.0');
      expect(file.metadata.changes).toContain('DoBIH v18.4');
      expect(file.metadata.count).toBe(count);
      expect(peaks).toHaveLength(count);
    });

    it('validates every peak, keeps ids unique and stays in range', () => {
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

        expect(parsed.list, `${parsed.name} list membership`).toContain(id);
        expect(parsed.heightM, `${parsed.name} height`).toBeGreaterThanOrEqual(
          minHeightM,
        );
        expect(parsed.heightM, `${parsed.name} height`).toBeLessThanOrEqual(maxHeightM);
        expect(parsed.lon, `${parsed.name} longitude`).toBeGreaterThanOrEqual(west);
        expect(parsed.lon, `${parsed.name} longitude`).toBeLessThanOrEqual(east);
        expect(parsed.lat, `${parsed.name} latitude`).toBeGreaterThanOrEqual(south);
        expect(parsed.lat, `${parsed.name} latitude`).toBeLessThanOrEqual(north);
      }
    });
  },
);

describe('Scottish list spot checks against DoBIH v18.4', () => {
  it('keeps Ben Nevis as the highest Munro', () => {
    const benNevis = munros.peaks.find((peak) => peak.dobihId === 278);
    const highest = [...munros.peaks].sort((a, b) => b.heightM - a.heightM)[0];

    expect(benNevis?.name).toBe('Ben Nevis [Beinn Nibheis]');
    expect(benNevis?.heightM).toBe(1344.53);
    expect(highest).toBe(benNevis);
  });

  it("keeps Beinn a' Chlaidheimh as the highest Corbett", () => {
    const highest = [...corbetts.peaks].sort((a, b) => b.heightM - a.heightM)[0];

    expect(highest?.name).toContain("Beinn a' Chlaidheimh");
  });

  it('keeps Beinn Talaidh as the highest Graham', () => {
    const highest = [...grahams.peaks].sort((a, b) => b.heightM - a.heightM)[0];

    expect(highest?.name).toContain('Beinn Talaidh');
  });

  it('keeps Merrick as the highest Donald, shared with the Corbetts', () => {
    const merrick = donalds.peaks.find((peak) => peak.dobihId === 1688);
    const highest = [...donalds.peaks].sort((a, b) => b.heightM - a.heightM)[0];

    expect(merrick?.name).toBe('Merrick');
    expect(merrick?.heightM).toBe(843);
    expect(highest).toBe(merrick);
    expect(merrick?.list).toEqual(['corbetts', 'donalds']);
    expect(corbetts.peaks.find((peak) => peak.dobihId === 1688)?.list).toEqual([
      'corbetts',
      'donalds',
    ]);
  });

  it('shares the dobih peak id namespace so progress records stay unique', () => {
    const allPeaks = [
      ...wainwrights.peaks,
      ...munros.peaks,
      ...corbetts.peaks,
      ...grahams.peaks,
      ...donalds.peaks,
    ];
    const byId = new Map<string, Peak[]>();

    for (const peak of allPeaks) {
      byId.set(peak.id, [...(byId.get(peak.id) ?? []), peak]);
    }

    for (const [peakId, records] of byId) {
      const names = new Set(records.map((peak) => peak.name));
      const lists = new Set(records.map((peak) => JSON.stringify(peak.list)));

      expect(names.size, `${peakId} name mismatch across lists`).toBe(1);
      expect(lists.size, `${peakId} list membership mismatch across files`).toBe(1);
    }
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
