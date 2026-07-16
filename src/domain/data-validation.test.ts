import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import boundaryRaw from '../data/boundaries/lake-district.geojson?raw';
import hillAreasRaw from '../data/boundaries/hill-areas.geojson?raw';
import { DOBIH_SOURCE, DOBIH_VERSION } from '../data/attribution';
import birketts from '../data/birketts.json';
import corbettTops from '../data/corbett-tops.json';
import corbetts from '../data/corbetts.json';
import countyTops from '../data/county-tops.json';
import deweys from '../data/deweys.json';
import donaldTops from '../data/donald-tops.json';
import donalds from '../data/donalds.json';
import ethels from '../data/ethels.json';
import fellrangers from '../data/fellrangers.json';
import furths from '../data/furths.json';
import grahamTops from '../data/graham-tops.json';
import grahams from '../data/grahams.json';
import hewitts from '../data/hewitts.json';
import humps from '../data/humps.json';
import marilyns from '../data/marilyns.json';
import munroTops from '../data/munro-tops.json';
import munros from '../data/munros.json';
import nuttalls from '../data/nuttalls.json';
import simms from '../data/simms.json';
import trail100 from '../data/trail-100.json';
import wainwrightOutlyingFells from '../data/wainwright-outlying-fells.json';
import wainwrights from '../data/wainwrights.json';
import { peakSchema, type Peak } from './schemas';

const boundary = JSON.parse(boundaryRaw) as unknown;
const hillAreas = JSON.parse(hillAreasRaw) as unknown;

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
    expect(wainwrights.metadata.source).toBe(DOBIH_SOURCE);
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

interface GeneratedListCase {
  id: string;
  file: PeakDataFile;
  count: number;
  /** Inclusive summit-height band from the list definition. */
  heightRangeM: [number, number];
  /** `[[west, south], [east, north]]` in WGS84. */
  bounds: [[number, number], [number, number]];
}

const generatedLists: GeneratedListCase[] = [
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
  {
    id: 'ethels',
    file: ethels,
    count: 95,
    heightRangeM: [270, 637],
    bounds: [
      [-2.2, 53.0],
      [-1.5, 53.62],
    ],
  },
  {
    id: 'hewitts',
    file: hewitts,
    count: 336,
    heightRangeM: [609, 1086],
    bounds: [
      [-7.9, 50.6],
      [-1.75, 55.55],
    ],
  },
  {
    id: 'marilyns',
    file: marilyns,
    count: 1621,
    heightRangeM: [150, 1345],
    bounds: [
      [-8.7, 50.1],
      [0.65, 60.9],
    ],
  },
  {
    id: 'munro-tops',
    file: munroTops,
    count: 226,
    heightRangeM: [914, 1266],
    bounds: [
      [-6.7, 56.05],
      [-2.9, 58.4],
    ],
  },
  {
    id: 'corbett-tops',
    file: corbettTops,
    count: 453,
    heightRangeM: [762, 915],
    bounds: [
      [-6.8, 54.95],
      [-2.6, 58.7],
    ],
  },
  {
    id: 'graham-tops',
    file: grahamTops,
    count: 844,
    heightRangeM: [600, 762],
    bounds: [
      [-7.4, 54.75],
      [-1.95, 58.65],
    ],
  },
  {
    id: 'donald-tops',
    file: donaldTops,
    count: 52,
    heightRangeM: [609, 812],
    bounds: [
      [-4.85, 54.8],
      [-1.95, 56.5],
    ],
  },
  {
    id: 'furths',
    file: furths,
    count: 21,
    heightRangeM: [914, 1086],
    bounds: [
      [-4.4, 52.9],
      [-2.75, 54.85],
    ],
  },
  {
    id: 'nuttalls',
    file: nuttalls,
    count: 442,
    heightRangeM: [609, 1086],
    bounds: [
      [-4.6, 50.5],
      [-1.6, 55.7],
    ],
  },
  {
    id: 'wainwright-outlying-fells',
    file: wainwrightOutlyingFells,
    count: 116,
    heightRangeM: [50, 621],
    bounds: [
      [-3.65, 54.06],
      [-2.55, 54.86],
    ],
  },
  {
    id: 'birketts',
    file: birketts,
    count: 541,
    heightRangeM: [304, 979],
    bounds: [
      [-3.58, 54.18],
      [-2.55, 54.82],
    ],
  },
  {
    id: 'fellrangers',
    file: fellrangers,
    count: 230,
    heightRangeM: [230, 979],
    bounds: [
      [-3.58, 54.18],
      [-2.55, 54.82],
    ],
  },
  {
    id: 'deweys',
    file: deweys,
    count: 425,
    heightRangeM: [500, 610],
    bounds: [
      [-5.1, 50.3],
      [-1.45, 55.75],
    ],
  },
  {
    id: 'humps',
    file: humps,
    count: 3096,
    heightRangeM: [100, 1345],
    bounds: [
      [-8.9, 49.95],
      [1.4, 61.0],
    ],
  },
  {
    id: 'simms',
    file: simms,
    count: 2552,
    heightRangeM: [600, 1345],
    bounds: [
      [-8.2, 50.45],
      [-1.6, 58.7],
    ],
  },
  {
    id: 'county-tops',
    file: countyTops,
    count: 90,
    heightRangeM: [80, 1345],
    bounds: [
      [-8.2, 50.4],
      [1.6, 60.8],
    ],
  },
  {
    id: 'trail-100',
    file: trail100,
    count: 100,
    heightRangeM: [315, 1345],
    bounds: [
      [-6.7, 50.5],
      [-0.85, 58.65],
    ],
  },
];

describe.each(generatedLists)(
  'committed $id data',
  ({ id, file, count, heightRangeM, bounds }) => {
    const peaks = file.peaks;
    const [minHeightM, maxHeightM] = heightRangeM;
    const [[west, south], [east, north]] = bounds;

    it('records DoBIH provenance and the published count', () => {
      // The committed data must name the same DoBIH release as the
      // attribution constants the licence line derives from.
      expect(file.metadata.source).toBe(DOBIH_SOURCE);
      expect(file.metadata.license).toBe('CC BY 4.0');
      expect(file.metadata.changes).toContain(`DoBIH ${DOBIH_VERSION}`);
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

describe('generated list spot checks against DoBIH v18.4', () => {
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
    const merrickLists = [
      'corbetts',
      'donalds',
      'marilyns',
      'humps',
      'simms',
      'county-tops',
      'trail-100',
    ];

    expect(merrick?.name).toBe('Merrick');
    expect(merrick?.heightM).toBe(843);
    expect(highest).toBe(merrick);
    expect(merrick?.list).toEqual(merrickLists);
    expect(corbetts.peaks.find((peak) => peak.dobihId === 1688)?.list).toEqual(
      merrickLists,
    );
  });

  it('keeps Kinder Scout as the highest Ethel', () => {
    const kinderScout = ethels.peaks.find((peak) => peak.dobihId === 2807);
    const highest = [...ethels.peaks].sort((a, b) => b.heightM - a.heightM)[0];

    expect(kinderScout?.name).toBe('Kinder Scout');
    expect(highest).toBe(kinderScout);
  });

  it('keeps Yr Wyddfa as the highest Hewitt and covers Northern Ireland', () => {
    const highest = [...hewitts.peaks].sort((a, b) => b.heightM - a.heightM)[0];
    const slieveDonard = hewitts.peaks.find((peak) => peak.dobihId === 20016);

    expect(highest?.name).toContain('Yr Wyddfa');
    expect(slieveDonard?.name).toBe('Slieve Donard');
  });

  it('scopes the Marilyns to the UK and Isle of Man', () => {
    const benNevis = marilyns.peaks.find((peak) => peak.dobihId === 278);
    const highest = [...marilyns.peaks].sort((a, b) => b.heightM - a.heightM)[0];

    // Highest Marilyn is Ben Nevis; Northern Ireland (Slieve Donard) and
    // the Isle of Man (Snaefell) are covered, while the Republic of
    // Ireland's Marilyns (e.g. Carrauntoohil) are excluded.
    expect(highest).toBe(benNevis);
    expect(marilyns.peaks.find((peak) => peak.dobihId === 20016)?.name).toBe(
      'Slieve Donard',
    );
    expect(marilyns.peaks.find((peak) => peak.dobihId === 1945)?.name).toBe('Snaefell');
    expect(marilyns.peaks.some((peak) => peak.name.includes('Carrauntoohil'))).toBe(
      false,
    );
  });

  it('scopes the HuMPs to the UK and Isle of Man', () => {
    const highest = [...humps.peaks].sort((a, b) => b.heightM - a.heightM)[0];

    // Northern Ireland and the Isle of Man are covered; the Republic of
    // Ireland's and the Channel Islands' HuMPs are excluded.
    expect(highest?.name).toContain('Ben Nevis');
    expect(humps.peaks.find((peak) => peak.dobihId === 20016)?.name).toBe(
      'Slieve Donard',
    );
    expect(humps.peaks.find((peak) => peak.dobihId === 1945)?.name).toBe('Snaefell');
    expect(humps.peaks.some((peak) => peak.name.includes('Carrauntoohil'))).toBe(false);
    expect(humps.peaks.some((peak) => peak.name.includes('Les Platons'))).toBe(false);
  });

  it('keeps well-known anchors on the newly added lists', () => {
    // Scafell Pike anchors the Lake District lists and the county tops.
    for (const file of [birketts, fellrangers, nuttalls, countyTops]) {
      expect(
        file.peaks.find((peak) => peak.dobihId === 2359)?.name,
        'Scafell Pike',
      ).toBe('Scafell Pike');
    }

    expect(furths.peaks.some((peak) => peak.name.includes('Carrauntoohil'))).toBe(
      false,
    );
    expect(trail100.peaks).toHaveLength(100);
    expect(
      wainwrightOutlyingFells.peaks.find((peak) => peak.name === 'Humphrey Head'),
    ).toBeDefined();
  });

  it('shares the dobih peak id namespace so progress records stay unique', () => {
    const allPeaks = [
      ...wainwrights.peaks,
      ...munros.peaks,
      ...corbetts.peaks,
      ...grahams.peaks,
      ...donalds.peaks,
      ...ethels.peaks,
      ...hewitts.peaks,
      ...marilyns.peaks,
      ...munroTops.peaks,
      ...corbettTops.peaks,
      ...grahamTops.peaks,
      ...donaldTops.peaks,
      ...furths.peaks,
      ...nuttalls.peaks,
      ...wainwrightOutlyingFells.peaks,
      ...birketts.peaks,
      ...fellrangers.peaks,
      ...deweys.peaks,
      ...humps.peaks,
      ...simms.peaks,
      ...countyTops.peaks,
      ...trail100.peaks,
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

describe('committed hill area model', () => {
  type AreaFeatureCollection = FeatureCollection<
    Polygon | MultiPolygon,
    {
      id: string;
      name: string;
      method: string;
    }
  > & {
    metadata?: {
      count?: number;
      method?: string;
      source?: string;
    };
  };

  const geojson = hillAreas as AreaFeatureCollection;

  it('contains one generated area for every hill on every list', () => {
    const peakIds = new Set(
      [
        wainwrights,
        munros,
        corbetts,
        grahams,
        donalds,
        ethels,
        hewitts,
        marilyns,
        munroTops,
        corbettTops,
        grahamTops,
        donaldTops,
        furths,
        nuttalls,
        wainwrightOutlyingFells,
        birketts,
        fellrangers,
        deweys,
        humps,
        simms,
        countyTops,
        trail100,
      ].flatMap((file) => file.peaks.map((peak) => peak.id)),
    );
    const areaIds = new Set(geojson.features.map((feature) => feature.properties.id));

    expect(geojson.metadata?.count).toBe(peakIds.size);
    expect(geojson.features).toHaveLength(peakIds.size);
    expect(areaIds).toEqual(peakIds);
  });

  it('was generated from the same DoBIH release the peak data ships', () => {
    // The profiles are stamped with DOBIH_VERSION at generation time; if the
    // peak data is regenerated after a DoBIH release bump without also
    // rerunning data:hill-boundaries, this pins the drift.
    expect(geojson.metadata?.source).toContain(`DoBIH ${DOBIH_VERSION}`);
  });

  it('keeps method provenance on every feature', () => {
    for (const feature of geojson.features) {
      expect(feature.properties.method).toBe('summit-centred-hill-profile');
      expect(feature.properties.name).toBeTruthy();
    }
  });

  it('has polygon coordinates within the UK and Isle of Man', () => {
    // The union of the source lists' bounds (HuMPs west and north, the
    // historic county tops east) plus the profiles' 2.75 km maximum radius.
    // Checked with plain comparisons: an expect() per coordinate across
    // ~5,500 profiles times the suite out.
    const violations: string[] = [];

    for (const feature of geojson.features) {
      expect(['Polygon', 'MultiPolygon']).toContain(feature.geometry.type);

      const pairs = collectAreaPairs(feature.geometry);
      expect(pairs.length, feature.properties.name).toBeGreaterThan(3);

      for (const [lon, lat] of pairs) {
        if (lon < -8.8 || lon > 1.35 || lat < 50.0 || lat > 61.0) {
          violations.push(`${feature.properties.name}: ${String(lon)},${String(lat)}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
