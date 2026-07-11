import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'csv-parse/sync';
import { strFromU8, unzipSync } from 'fflate';
import { format } from 'prettier';

import { peakSchema, type Peak } from '../src/domain/schemas';

const DOBIH_ZIP_URL = 'https://www.hill-bagging.co.uk/dobih-downloads/hillcsv.zip';
const SOURCE = 'Database of British and Irish Hills v18.4';
const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data');

type DobihRow = Record<string, string>;

interface HillListConfig {
  /** Registry id, also used as the peak `list` membership value. */
  id: string;
  /** Display name used in metadata and error messages. */
  name: string;
  /**
   * DoBIH classification flag column. In the hillcsv download each
   * classification is a 0/1 column named by its DoBIH code: `W` Wainwright,
   * `M` Munro, `C` Corbett, `G` Graham, `D` Donald.
   */
  flagColumn: string;
  outputFile: string;
  /** Exact list size cross-checked against published figures. */
  expectedCount: number;
  /** National park applied to every peak, when the whole list sits in one. */
  nationalPark?: string;
  /** Inclusive sanity band for summit heights, from the list definition. */
  heightRangeM: [number, number];
  /** Throws when well-known peaks look wrong in the parsed output. */
  spotCheck: (peaks: Peak[]) => void;
}

function findPeak(peaks: Peak[], dobihId: number, listName: string): Peak {
  const peak = peaks.find((candidate) => candidate.dobihId === dobihId);

  if (!peak) {
    throw new Error(`${listName}: expected DoBIH hill ${dobihId} to be present.`);
  }

  return peak;
}

function highestOf(peaks: Peak[]): Peak {
  return peaks.reduce((current, peak) =>
    peak.heightM > current.heightM ? peak : current,
  );
}

function lowestOf(peaks: Peak[]): Peak {
  return peaks.reduce((current, peak) =>
    peak.heightM < current.heightM ? peak : current,
  );
}

const HILL_LIST_CONFIGS: readonly HillListConfig[] = [
  {
    id: 'wainwrights',
    name: 'Wainwrights',
    flagColumn: 'W',
    outputFile: 'wainwrights.json',
    expectedCount: 214,
    nationalPark: 'Lake District',
    heightRangeM: [290, 980],
    spotCheck: (peaks) => {
      const skiddaw = findPeak(peaks, 2319, 'Wainwrights');

      if (skiddaw.name !== 'Skiddaw' || Math.round(skiddaw.heightM) !== 930) {
        throw new Error('Skiddaw spot-check failed.');
      }

      if (highestOf(peaks).name !== 'Scafell Pike') {
        throw new Error(`Highest Wainwright check failed: ${highestOf(peaks).name}`);
      }

      if (lowestOf(peaks).name !== 'Castle Crag') {
        throw new Error(`Lowest Wainwright check failed: ${lowestOf(peaks).name}`);
      }
    },
  },
  {
    id: 'munros',
    name: 'Munros',
    flagColumn: 'M',
    outputFile: 'munros.json',
    expectedCount: 282,
    heightRangeM: [914, 1345],
    spotCheck: (peaks) => {
      const benNevis = findPeak(peaks, 278, 'Munros');
      const highest = highestOf(peaks);

      if (
        highest !== benNevis ||
        !benNevis.name.startsWith('Ben Nevis') ||
        Math.round(benNevis.heightM) !== 1345
      ) {
        throw new Error(`Ben Nevis spot-check failed: ${highest.name}`);
      }

      if (lowestOf(peaks).name !== 'Beinn Teallach') {
        throw new Error(`Lowest Munro check failed: ${lowestOf(peaks).name}`);
      }
    },
  },
  {
    id: 'corbetts',
    name: 'Corbetts',
    flagColumn: 'C',
    outputFile: 'corbetts.json',
    expectedCount: 222,
    heightRangeM: [762, 915],
    spotCheck: (peaks) => {
      const highest = highestOf(peaks);

      if (!highest.name.startsWith("Beinn a' Chlaidheimh")) {
        throw new Error(`Highest Corbett check failed: ${highest.name}`);
      }
    },
  },
  {
    id: 'grahams',
    name: 'Grahams',
    flagColumn: 'G',
    outputFile: 'grahams.json',
    expectedCount: 231,
    heightRangeM: [600, 762],
    spotCheck: (peaks) => {
      const highest = highestOf(peaks);

      if (!highest.name.startsWith('Beinn Talaidh')) {
        throw new Error(`Highest Graham check failed: ${highest.name}`);
      }
    },
  },
  {
    id: 'donalds',
    name: 'Donalds',
    flagColumn: 'D',
    outputFile: 'donalds.json',
    expectedCount: 89,
    heightRangeM: [609, 844],
    spotCheck: (peaks) => {
      const merrick = findPeak(peaks, 1688, 'Donalds');
      const benCleuch = findPeak(peaks, 1642, 'Donalds');

      if (highestOf(peaks) !== merrick || Math.round(merrick.heightM) !== 843) {
        throw new Error(`Merrick spot-check failed: ${highestOf(peaks).name}`);
      }

      if (benCleuch.name !== 'Ben Cleuch' || Math.round(benCleuch.heightM) !== 721) {
        throw new Error('Ben Cleuch spot-check failed.');
      }
    },
  },
];

type PeakDataFile = {
  metadata: {
    source: typeof SOURCE;
    license: 'CC BY 4.0';
    sourceUrl: 'https://www.hill-bagging.co.uk/dobih';
    downloadedFrom: typeof DOBIH_ZIP_URL;
    changes: string;
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

/**
 * Region for display. Wainwrights carry a DoBIH `Area` such as
 * "Lake District - Southern Fells"; most Scottish hills have an empty `Area`,
 * so fall back to the DoBIH `Region` with its section code ("01A: ") removed.
 */
function toRegion(row: DobihRow, dobihId: number): string {
  const area = row.Area?.trim();

  if (area) {
    return area;
  }

  const region = row.Region?.trim().replace(/^\d+[A-Z]?:\s*/, '');

  if (!region) {
    throw new Error(`Missing Area and Region for DoBIH row ${dobihId}`);
  }

  return region;
}

function toPeak(row: DobihRow, config: HillListConfig): Peak {
  const dobihId = parseRequiredNumber(row, 'Number');
  const heightM = parseRequiredNumber(row, 'Metres');
  const heightFt = parseRequiredNumber(row, 'Feet');
  const lat = parseRequiredNumber(row, 'Latitude');
  const lon = parseRequiredNumber(row, 'Longitude');
  const name = row.Name?.trim();
  const gridRef = row['Grid ref']?.trim();
  const list = HILL_LIST_CONFIGS.filter(
    (candidate) => row[candidate.flagColumn] === '1',
  ).map((candidate) => candidate.id);

  if (!name || !gridRef) {
    throw new Error(`Missing required text field for DoBIH row ${dobihId}`);
  }

  return peakSchema.parse({
    id: `dobih-${dobihId}`,
    dobihId,
    name,
    list,
    region: toRegion(row, dobihId),
    ...(config.nationalPark ? { nationalPark: config.nationalPark } : {}),
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

function parseList(rows: DobihRow[], config: HillListConfig): Peak[] {
  const peaks = rows
    .filter((row) => row[config.flagColumn] === '1')
    .map((row) => toPeak(row, config))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));

  if (peaks.length !== config.expectedCount) {
    throw new Error(
      `Expected ${config.expectedCount} ${config.name}, found ${peaks.length}.`,
    );
  }

  const ids = new Set(peaks.map((peak) => peak.id));
  const dobihIds = new Set(peaks.map((peak) => peak.dobihId));

  if (ids.size !== peaks.length || dobihIds.size !== peaks.length) {
    throw new Error(`${config.name} dataset contains duplicate ids.`);
  }

  const [minHeightM, maxHeightM] = config.heightRangeM;

  for (const peak of peaks) {
    if (peak.heightM < minHeightM || peak.heightM > maxHeightM) {
      throw new Error(
        `${config.name} height check failed: ${peak.name} is ${peak.heightM}m, ` +
          `outside ${minHeightM}-${maxHeightM}m.`,
      );
    }
  }

  config.spotCheck(peaks);

  return peaks;
}

/** Compares generated output to the committed file, ignoring `generatedAt`. */
function isEquivalent(previousRaw: string, file: PeakDataFile): boolean {
  let previous: unknown;

  try {
    previous = JSON.parse(previousRaw);
  } catch {
    return false;
  }

  const normalize = (value: PeakDataFile) =>
    JSON.stringify({
      ...value,
      metadata: { ...value.metadata, generatedAt: '' },
    });

  return normalize(previous as PeakDataFile) === normalize(file);
}

async function writeJson(outputPath: string, file: PeakDataFile) {
  let previous: string | undefined;

  try {
    previous = await readFile(outputPath, 'utf8');
  } catch {
    previous = undefined;
  }

  if (previous !== undefined && isEquivalent(previous, file)) {
    return false;
  }

  const next = await format(JSON.stringify(file), { parser: 'json' });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, next, 'utf8');

  return true;
}

const requestedIds = process.argv.slice(2);
const unknownIds = requestedIds.filter(
  (id) => !HILL_LIST_CONFIGS.some((config) => config.id === id),
);

if (unknownIds.length > 0) {
  const known = HILL_LIST_CONFIGS.map((config) => config.id).join(', ');
  throw new Error(`Unknown hill list(s): ${unknownIds.join(', ')}. Known: ${known}`);
}

const configs =
  requestedIds.length > 0
    ? HILL_LIST_CONFIGS.filter((config) => requestedIds.includes(config.id))
    : HILL_LIST_CONFIGS;

const rows = parse(readCsvFromZip(await getZipBytes()), {
  bom: true,
  columns: true,
  skip_empty_lines: true,
}) as DobihRow[];

for (const config of configs) {
  const peaks = parseList(rows, config);
  const outputPath = resolve(DATA_DIR, config.outputFile);
  const wrote = await writeJson(outputPath, {
    metadata: {
      source: SOURCE,
      license: 'CC BY 4.0',
      sourceUrl: 'https://www.hill-bagging.co.uk/dobih',
      downloadedFrom: DOBIH_ZIP_URL,
      changes: `Trimmed to ${config.name} and reformatted from DoBIH v18.4`,
      generatedAt: new Date().toISOString().slice(0, 10),
      count: peaks.length,
    },
    peaks,
  });

  console.log(
    wrote
      ? `Wrote ${peaks.length} ${config.name} to ${outputPath}`
      : `${config.name} unchanged (${peaks.length} peaks); kept ${outputPath}`,
  );
}
