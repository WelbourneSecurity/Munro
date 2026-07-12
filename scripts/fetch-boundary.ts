import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serializeGeoJson } from './geojson-io';

const ATTRIBUTION =
  '© Natural England copyright. Contains Ordnance Survey data © Crown copyright and database right 2026.';
const SERVICE_URL =
  'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Parks_England/FeatureServer/0/query';
const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/data/boundaries/lake-district.geojson',
);

type ArcGisFeatureCollection = {
  type: 'FeatureCollection';
  crs?: unknown;
  features: Array<{
    type: 'Feature';
    geometry: {
      type: string;
      coordinates: unknown;
    } | null;
    properties: Record<string, unknown>;
  }>;
};

function buildUrl() {
  const params = new URLSearchParams({
    where: "NAME='LAKE DISTRICT'",
    outFields: 'CODE,NAME,MEASURE,STATUS',
    returnGeometry: 'true',
    outSR: '4326',
    geometryPrecision: '5',
    maxAllowableOffset: '0.0005',
    f: 'geojson',
  });

  return `${SERVICE_URL}?${params.toString()}`;
}

function isLonLatPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

function collectPairs(value: unknown, pairs: Array<[number, number]> = []) {
  if (isLonLatPair(value)) {
    pairs.push([value[0], value[1]]);
    return pairs;
  }

  if (Array.isArray(value)) {
    for (const child of value) {
      collectPairs(child, pairs);
    }
  }

  return pairs;
}

async function fetchBoundary() {
  const response = await fetch(buildUrl());

  if (!response.ok) {
    throw new Error(`Failed to fetch Lake District boundary: ${response.status}`);
  }

  const data = (await response.json()) as ArcGisFeatureCollection;
  const feature = data.features[0];

  if (data.type !== 'FeatureCollection' || data.features.length !== 1 || !feature) {
    throw new Error(
      `Expected one Lake District feature, found ${data.features.length}.`,
    );
  }

  if (!feature.geometry || feature.geometry.type !== 'Polygon') {
    throw new Error(`Expected a Polygon geometry, found ${feature.geometry?.type}.`);
  }

  const pairs = collectPairs(feature.geometry.coordinates);

  if (pairs.length < 100) {
    throw new Error(
      `Boundary simplification returned too few vertices: ${pairs.length}.`,
    );
  }

  for (const [lon, lat] of pairs) {
    if (lon < -4 || lon > -2 || lat < 54 || lat > 55.2) {
      throw new Error(`Coordinate outside Lake District bounds: ${lon},${lat}`);
    }
  }

  return {
    type: 'FeatureCollection' as const,
    metadata: {
      source: 'Natural England National Parks (England)',
      sourceUrl:
        'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Parks_England/FeatureServer',
      license: 'OGL v3',
      attribution: ATTRIBUTION,
      changes:
        'Queried in WGS84 and simplified with geometryPrecision=5 and maxAllowableOffset=0.0005',
      generatedAt: '2026-07-05',
    },
    features: [
      {
        type: 'Feature' as const,
        properties: {
          ...feature.properties,
          attribution: ATTRIBUTION,
        },
        geometry: feature.geometry,
      },
    ],
  };
}

async function writeJson(data: Awaited<ReturnType<typeof fetchBoundary>>) {
  const next = serializeGeoJson(data);
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

const boundary = await fetchBoundary();
await writeJson(boundary);

console.log(`Wrote Lake District boundary to ${OUTPUT_PATH}`);
