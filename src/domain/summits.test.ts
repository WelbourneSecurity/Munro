import type { Peak } from './schemas';
import {
  SUMMIT_DETECTION_MAX_ACCURACY_M,
  SUMMIT_DETECTION_RADIUS_M,
  detectSummitedPeaks,
  haversineDistanceM,
  summitDetectionRadiusM,
} from './summits';

// One degree of latitude is roughly 111,195 m at the mean Earth radius, so
// this factor converts a metre offset into a latitude offset for test peaks.
const METRES_PER_DEGREE_LAT = 111_195;

function makePeak(id: string, lat: number, lon: number, name = id): Peak {
  return {
    id,
    dobihId: 1,
    name,
    list: ['wainwright'],
    region: 'Test Fells',
    heightM: 900,
    lat,
    lon,
  };
}

function metresNorth(lat: number, metres: number) {
  return lat + metres / METRES_PER_DEGREE_LAT;
}

describe('haversineDistanceM', () => {
  it('returns zero for identical points', () => {
    const point = { lat: 54.527, lon: -3.0165 };

    expect(haversineDistanceM(point, point)).toBe(0);
  });

  it('is symmetric', () => {
    const a = { lat: 54.527, lon: -3.0165 };
    const b = { lat: 54.4542, lon: -3.2116 };

    expect(haversineDistanceM(a, b)).toBeCloseTo(haversineDistanceM(b, a), 6);
  });

  it('measures one degree of latitude as roughly 111.2 km', () => {
    const distance = haversineDistanceM({ lat: 54, lon: -3 }, { lat: 55, lon: -3 });

    expect(distance).toBeCloseTo(METRES_PER_DEGREE_LAT, -3);
  });

  it('measures Scafell Pike to Helvellyn as roughly 14.4 km', () => {
    const scafellPike = { lat: 54.4542, lon: -3.2116 };
    const helvellyn = { lat: 54.527, lon: -3.0165 };

    const distance = haversineDistanceM(scafellPike, helvellyn);

    expect(distance).toBeGreaterThan(14_000);
    expect(distance).toBeLessThan(15_500);
  });

  it('handles antipodal points without NaN', () => {
    const distance = haversineDistanceM({ lat: 0, lon: 0 }, { lat: 0, lon: 180 });

    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeGreaterThan(20_000_000);
  });
});

describe('summitDetectionRadiusM', () => {
  it('widens the base radius by the reported accuracy', () => {
    expect(summitDetectionRadiusM(0)).toBe(SUMMIT_DETECTION_RADIUS_M);
    expect(summitDetectionRadiusM(30)).toBe(SUMMIT_DETECTION_RADIUS_M + 30);
  });

  it('never widens beyond the accuracy cut-off', () => {
    expect(summitDetectionRadiusM(10_000)).toBe(
      SUMMIT_DETECTION_RADIUS_M + SUMMIT_DETECTION_MAX_ACCURACY_M,
    );
  });

  it('treats negative accuracy as zero', () => {
    expect(summitDetectionRadiusM(-5)).toBe(SUMMIT_DETECTION_RADIUS_M);
  });
});

describe('detectSummitedPeaks', () => {
  const baseLat = 54.5;
  const baseLon = -3.1;
  const summit = makePeak('dobih-1', baseLat, baseLon, 'High Fell');

  it('detects a peak when standing on the summit', () => {
    const detections = detectSummitedPeaks(
      { lat: baseLat, lon: baseLon, accuracyM: 10 },
      [summit],
    );

    expect(detections).toHaveLength(1);
    expect(detections[0]?.peak.id).toBe('dobih-1');
    expect(detections[0]?.distanceM).toBe(0);
  });

  it('detects a peak just inside the base radius', () => {
    const nearby = {
      lat: metresNorth(baseLat, SUMMIT_DETECTION_RADIUS_M - 10),
      lon: baseLon,
      accuracyM: 0,
    };

    expect(detectSummitedPeaks(nearby, [summit])).toHaveLength(1);
  });

  it('ignores a peak outside the detection radius', () => {
    const distant = {
      lat: metresNorth(baseLat, 400),
      lon: baseLon,
      accuracyM: 10,
    };

    expect(detectSummitedPeaks(distant, [summit])).toHaveLength(0);
  });

  it('widens the radius for a fuzzier fix', () => {
    const position = {
      lat: metresNorth(baseLat, 130),
      lon: baseLon,
    };

    expect(detectSummitedPeaks({ ...position, accuracyM: 5 }, [summit])).toHaveLength(
      0,
    );
    expect(detectSummitedPeaks({ ...position, accuracyM: 50 }, [summit])).toHaveLength(
      1,
    );
  });

  it('never triggers on a very poor accuracy fix, even on the summit', () => {
    const detections = detectSummitedPeaks(
      { lat: baseLat, lon: baseLon, accuracyM: 2_000 },
      [summit],
    );

    expect(detections).toHaveLength(0);
  });

  it('rejects non-finite or negative accuracy values', () => {
    const onSummit = { lat: baseLat, lon: baseLon };

    expect(detectSummitedPeaks({ ...onSummit, accuracyM: NaN }, [summit])).toHaveLength(
      0,
    );
    expect(
      detectSummitedPeaks({ ...onSummit, accuracyM: Infinity }, [summit]),
    ).toHaveLength(0);
    expect(detectSummitedPeaks({ ...onSummit, accuracyM: -1 }, [summit])).toHaveLength(
      0,
    );
  });

  it('returns two adjacent summits nearest first', () => {
    const nearer = makePeak('dobih-2', metresNorth(baseLat, 40), baseLon, 'Near Top');
    const farther = makePeak('dobih-3', metresNorth(baseLat, 90), baseLon, 'Far Top');

    const detections = detectSummitedPeaks(
      { lat: baseLat, lon: baseLon, accuracyM: 10 },
      [farther, nearer],
    );

    expect(detections.map((detection) => detection.peak.id)).toEqual([
      'dobih-2',
      'dobih-3',
    ]);
  });

  it('breaks distance ties by name', () => {
    const east = makePeak('dobih-4', baseLat, baseLon, 'Zeta Crag');
    const west = makePeak('dobih-5', baseLat, baseLon, 'Alpha Crag');

    const detections = detectSummitedPeaks(
      { lat: baseLat, lon: baseLon, accuracyM: 10 },
      [east, west],
    );

    expect(detections.map((detection) => detection.peak.name)).toEqual([
      'Alpha Crag',
      'Zeta Crag',
    ]);
  });

  it('excludes already-bagged peaks', () => {
    const neighbour = makePeak('dobih-6', metresNorth(baseLat, 30), baseLon);

    const detections = detectSummitedPeaks(
      { lat: baseLat, lon: baseLon, accuracyM: 10 },
      [summit, neighbour],
      { excludePeakIds: new Set(['dobih-1']) },
    );

    expect(detections.map((detection) => detection.peak.id)).toEqual(['dobih-6']);
  });

  it('returns nothing for an empty peaks array', () => {
    expect(
      detectSummitedPeaks({ lat: baseLat, lon: baseLon, accuracyM: 10 }, []),
    ).toHaveLength(0);
  });
});
