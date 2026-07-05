import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'csv-parse/sync';
import { strFromU8, unzipSync } from 'fflate';
import { format } from 'prettier';

import { peakSchema, type Peak } from '../src/domain/schemas';

const DOBIH_ZIP_URL = 'https://www.hill-bagging.co.uk/dobih-downloads/hillcsv.zip';
const SOURCE = 'Database of British and Irish Hills v18.4';
const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/data/wainwrights.json',
);

type DobihRow = Record<string, string>;

type WainwrightsFile = {
  metadata: {
    source: typeof SOURCE;
    license: 'CC BY 4.0';
    sourceUrl: 'https://www.hill-bagging.co.uk/dobih';
    downloadedFrom: typeof DOBIH_ZIP_URL;
    changes: 'Trimmed to Wainwrights and reformatted from DoBIH v18.4';
    generatedAt: string;
    count: number;
  };
  peaks: Peak[];
};

function parseRequiredNumber(row: DobihRow, field: string): number {
  const rawValue = row[field];
  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric field ${field}=${rawValue ?? '<missing>'}`);
  }

  return value;
}

function toPeak(row: DobihRow): Peak {
  const dobihId = parseRequiredNumber(row, 'Number');
  const heightM = parseRequiredNumber(row, 'Metres');
  const heightFt = parseRequiredNumber(row, 'Feet');
  const lat = parseRequiredNumber(row, 'Latitude');
  const lon = parseRequiredNumber(row, 'Longitude');
  const area = row.Area?.trim();
  const name = row.Name?.trim();
  const gridRef = row['Grid ref']?.trim();

  if (!name || !area || !gridRef) {
    throw new Error(`Missing required text field for DoBIH row ${dobihId}`);
  }

  return peakSchema.parse({
    id: `dobih-${dobihId}`,
    dobihId,
    name,
    list: ['wainwrights'],
    region: area,
    nationalPark: 'Lake District',
    heightM,
    heightFt,
    lat,
    lon,
    gridRef,
    source: SOURCE,
  });
}

async function getZipBytes() {
  const response = await fetch(DOBIH_ZIP_URL);

  if (!response.ok) {
    throw new Error(`Failed to download DoBIH CSV: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function readCsvFromZip(zipBytes: Uint8Array) {
  const entries = unzipSync(zipBytes);
  const csvName = Object.keys(entries).find((entry) => entry.endsWith('.csv'));

  if (!csvName) {
    throw new Error('DoBIH ZIP did not contain a CSV file.');
  }

  const csvBytes = entries[csvName];

  if (!csvBytes) {
    throw new Error(`Could not read ${csvName} from DoBIH ZIP.`);
  }

  return strFromU8(csvBytes);
}

function parseWainwrights(csv: string) {
  const rows = parse(csv, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  }) as DobihRow[];

  const peaks = rows
    .filter((row) => row.W === '1')
    .map(toPeak)
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));

  if (peaks.length !== 214) {
    throw new Error(`Expected 214 Wainwrights, found ${peaks.length}.`);
  }

  const ids = new Set(peaks.map((peak) => peak.id));
  const dobihIds = new Set(peaks.map((peak) => peak.dobihId));

  if (ids.size !== peaks.length || dobihIds.size !== peaks.length) {
    throw new Error('Wainwrights dataset contains duplicate ids.');
  }

  const skiddaw = peaks.find((peak) => peak.dobihId === 2319);
  const highest = peaks.reduce((current, peak) =>
    peak.heightM > current.heightM ? peak : current,
  );
  const lowest = peaks.reduce((current, peak) =>
    peak.heightM < current.heightM ? peak : current,
  );

  if (!skiddaw || skiddaw.name !== 'Skiddaw' || Math.round(skiddaw.heightM) !== 930) {
    throw new Error('Skiddaw spot-check failed.');
  }

  if (highest.name !== 'Scafell Pike') {
    throw new Error(`Highest Wainwright check failed: ${highest.name}`);
  }

  if (lowest.name !== 'Castle Crag') {
    throw new Error(`Lowest Wainwright check failed: ${lowest.name}`);
  }

  return peaks;
}

async function writeJson(file: WainwrightsFile) {
  const next = await format(JSON.stringify(file), { parser: 'json' });
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

const peaks = parseWainwrights(readCsvFromZip(await getZipBytes()));

await writeJson({
  metadata: {
    source: SOURCE,
    license: 'CC BY 4.0',
    sourceUrl: 'https://www.hill-bagging.co.uk/dobih',
    downloadedFrom: DOBIH_ZIP_URL,
    changes: 'Trimmed to Wainwrights and reformatted from DoBIH v18.4',
    generatedAt: '2026-07-05',
    count: peaks.length,
  },
  peaks,
});

console.log(`Wrote ${peaks.length} Wainwrights to ${OUTPUT_PATH}`);
