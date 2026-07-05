import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  bearing,
  destination,
  distance,
  featureCollection,
  intersect,
} from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { format } from 'prettier';

import type { Peak } from '../src/domain/schemas';

const ROOT: string = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PEAKS_PATH: string = resolve(ROOT, 'src/data/wainwrights.json');
const BOUNDARY_PATH: string = resolve(
  ROOT,
  'src/data/boundaries/lake-district.geojson',
);
const OUTPUT_PATH: string = resolve(
  ROOT,
  'src/data/boundaries/wainwright-areas.geojson',
);

const BEARING_STEP_DEGREES = 5;
const NEIGHBOUR_INFLUENCE_DEGREES = 78;

type PeakFile = {
  peaks: Peak[];
};

type BoundaryFile = FeatureCollection<Polygon> & {
  metadata?: Record<string, unknown>;
};

type HillAreaProperties = {
  id: string;
  dobihId: number;
  name: string;
  region: string;
  method: 'summit-centred-hill-profile';
  profile: {
    baseRadiusKm: number;
    sampleStepDegrees: number;
    neighbourInfluenceDegrees: number;
  };
};

type HillAreaFeature = Feature<Polygon | MultiPolygon, HillAreaProperties>;

type Neighbour = {
  bearingDegrees: number;
  distanceKm: number;
};

async function readJson<T>(path: string) {
  const raw: string = await readFile(path, { encoding: 'utf8' });
  return JSON.parse(raw) as T;
}

async function writeJson(data: unknown) {
  const next = await format(JSON.stringify(data), { parser: 'json' });
  let previous: string | undefined;

  try {
    previous = await readFile(OUTPUT_PATH, 'utf8');
  } catch {
    previous = undefined;
  }

  if (previous === next) {
    return;
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, next, 'utf8');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function angularDifference(first: number, second: number) {
  const diff = Math.abs(((((first - second) % 360) + 540) % 360) - 180);
  return diff;
}

function seededWave(seed: number, bearingDegrees: number) {
  const radians = (bearingDegrees * Math.PI) / 180;

  return (
    1 +
    Math.sin(radians * 2 + seed) * 0.16 +
    Math.sin(radians * 5 + seed * 0.73) * 0.08 +
    Math.cos(radians * 3 - seed * 0.41) * 0.06
  );
}

function profileRadiusKm(peak: Peak, bearingDegrees: number, neighbours: Neighbour[]) {
  const heightScale = clamp((peak.heightM - 290) / (980 - 290), 0, 1);
  const baseRadiusKm = 0.82 + heightScale * 1.18;
  const seed = peak.dobihId * 0.013;
  const shapedRadius = baseRadiusKm * seededWave(seed, bearingDegrees);
  const nearestDirectionalShoulder = neighbours.reduce((nearest, neighbour) => {
    const diff = angularDifference(bearingDegrees, neighbour.bearingDegrees);

    if (diff > NEIGHBOUR_INFLUENCE_DEGREES) {
      return nearest;
    }

    const blend = diff / NEIGHBOUR_INFLUENCE_DEGREES;
    const splitDistance = neighbour.distanceKm * (0.44 + blend * 0.38);

    return Math.min(nearest, splitDistance);
  }, Number.POSITIVE_INFINITY);

  return clamp(Math.min(shapedRadius, nearestDirectionalShoulder), 0.42, 2.75);
}

function smoothRadii(radii: number[]) {
  return radii.map((radius, index) => {
    const previous = radii[(index - 1 + radii.length) % radii.length] ?? radius;
    const next = radii[(index + 1) % radii.length] ?? radius;

    return previous * 0.24 + radius * 0.52 + next * 0.24;
  });
}

function propertiesForPeak(peak: Peak): HillAreaProperties {
  const heightScale = clamp((peak.heightM - 290) / (980 - 290), 0, 1);

  return {
    id: peak.id,
    dobihId: peak.dobihId,
    name: peak.name,
    region: peak.region,
    method: 'summit-centred-hill-profile',
    profile: {
      baseRadiusKm: Number((0.82 + heightScale * 1.18).toFixed(3)),
      sampleStepDegrees: BEARING_STEP_DEGREES,
      neighbourInfluenceDegrees: NEIGHBOUR_INFLUENCE_DEGREES,
    },
  };
}

function buildProfilePolygon(peak: Peak, peaks: Peak[]) {
  const summit = [peak.lon, peak.lat] satisfies [number, number];
  const neighbours = peaks
    .filter((candidate) => candidate.id !== peak.id)
    .map((candidate) => {
      const candidatePosition = [candidate.lon, candidate.lat] satisfies [
        number,
        number,
      ];

      return {
        bearingDegrees: bearing(summit, candidatePosition),
        distanceKm: distance(summit, candidatePosition, { units: 'kilometers' }),
      };
    })
    .filter((neighbour) => neighbour.distanceKm < 7.5);
  const bearings = Array.from(
    { length: 360 / BEARING_STEP_DEGREES },
    (_, index) => index * BEARING_STEP_DEGREES,
  );
  const rawRadii = bearings.map((bearingDegrees) =>
    profileRadiusKm(peak, bearingDegrees, neighbours),
  );
  const radii = smoothRadii(smoothRadii(rawRadii));
  const ring = bearings.map((bearingDegrees, index) => {
    const radiusKm = radii[index] ?? rawRadii[index] ?? 0.7;
    const point = destination(summit, radiusKm, bearingDegrees, {
      units: 'kilometers',
    });
    const [lon, lat] = point.geometry.coordinates;

    if (lon === undefined || lat === undefined) {
      throw new Error(`Generated invalid coordinate for ${peak.name}.`);
    }

    return [lon, lat] satisfies [number, number];
  });

  const first = ring[0];

  if (!first) {
    throw new Error(`Generated empty profile for ${peak.name}.`);
  }

  return {
    type: 'Feature' as const,
    properties: propertiesForPeak(peak),
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[...ring, first]],
    },
  };
}

function buildAreas(peaks: Peak[], boundary: BoundaryFile) {
  const parkFeature = boundary.features[0];

  if (!parkFeature) {
    throw new Error('Lake District boundary file has no features.');
  }

  const features = peaks.map((peak) => {
    const profile = buildProfilePolygon(peak, peaks);
    const clipped = intersect(featureCollection([profile, parkFeature]), {
      properties: profile.properties,
    }) as HillAreaFeature | null;

    if (!clipped) {
      throw new Error(`Could not build a hill profile for ${peak.name}.`);
    }

    return clipped;
  });

  return {
    type: 'FeatureCollection' as const,
    metadata: {
      source:
        'Generated from DoBIH v18.4 Wainwright summit points and Natural England Lake District National Park boundary',
      method:
        'Summit-centred hill profiles: generate one soft radial footprint around each Wainwright summit, shape it by height and nearby summits, then clip to the Lake District National Park boundary. These are visual hill-lighting profiles, not authoritative geomorphological, route or land-boundary data.',
      profile: {
        sampleStepDegrees: BEARING_STEP_DEGREES,
        neighbourInfluenceDegrees: NEIGHBOUR_INFLUENCE_DEGREES,
        maximumRadiusKm: 2.75,
      },
      generatedAt: '2026-07-05',
      count: features.length,
    },
    features: features.sort((a, b) =>
      a.properties.name.localeCompare(b.properties.name),
    ),
  };
}

const peakFile = await readJson<PeakFile>(PEAKS_PATH);
const boundary = await readJson<BoundaryFile>(BOUNDARY_PATH);
const areas = buildAreas(peakFile.peaks, boundary);

await writeJson(areas);

console.log(
  `Wrote ${areas.features.length} Wainwright hill profiles to ${OUTPUT_PATH}`,
);
