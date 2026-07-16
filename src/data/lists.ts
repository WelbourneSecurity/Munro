import { mergePeakLists } from '../domain';
import type { Peak } from '../domain';

/**
 * Registry of the hill lists Munro can track.
 *
 * Adding a list is a data-only change: commit its generated peak JSON under
 * `src/data/`, then add one entry (and its id) here. No component, store or
 * map refactor should be required.
 */

export const HILL_LIST_IDS = [
  'all',
  'wainwrights',
  'munros',
  'corbetts',
  'grahams',
  'donalds',
  'ethels',
  'hewitts',
  'marilyns',
  'munro-tops',
  'corbett-tops',
  'graham-tops',
  'donald-tops',
  'furths',
  'nuttalls',
  'wainwright-outlying-fells',
  'birketts',
  'fellrangers',
  'deweys',
  'humps',
  'simms',
  'county-tops',
  'trail-100',
] as const;

export type HillListId = (typeof HILL_LIST_IDS)[number];

export const DEFAULT_HILL_LIST_ID: HillListId = 'all';

/** `[[west, south], [east, north]]` in WGS84, used for map fit and pan limits. */
export type HillListBounds = [[number, number], [number, number]];

export interface HillListView {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface HillListDefinition {
  id: HillListId;
  /** Display name, e.g. "Wainwrights". */
  name: string;
  /** Region hint shown above the list name, e.g. "Lake District". */
  regionLabel: string;
  /** Plural noun for peaks in this list, e.g. "fells". */
  peakNoun: string;
  /** Map-fit bounds for the whole list. */
  bounds: HillListBounds;
  /** Initial camera for the list's region. */
  initialView: HillListView;
  /**
   * Whether generated hill-lighting profiles exist for this list. The
   * committed UK-wide profile set covers every hill on every registered
   * list, so this is true across the registry; a future list must either
   * regenerate the profiles (npm run data:hill-boundaries) or ship false
   * and fall back to summit markers.
   */
  hasHillLighting: boolean;
  /** Lazily loads the list's peak data so bundles don't grow per list. */
  loadPeaks: () => Promise<Peak[]>;
}

// Must contain the whole committed park boundary polygon
// (src/data/boundaries/lake-district.geojson, bbox lon -3.4956..-2.5826,
// lat 54.1915..54.7637): the live map clamps its viewport to these bounds
// and the export frames them, so a tighter box would cut the outline off.
export const LAKE_DISTRICT_BOUNDS: HillListBounds = [
  [-3.58, 54.18],
  [-2.55, 54.82],
];

export const LAKE_DISTRICT_INITIAL_VIEW: HillListView = {
  longitude: -3.1,
  latitude: 54.53,
  zoom: 8.55,
  bearing: -12,
  pitch: 38,
};

const wainwrights: HillListDefinition = {
  id: 'wainwrights',
  name: 'Wainwrights',
  regionLabel: 'Lake District',
  peakNoun: 'fells',
  bounds: LAKE_DISTRICT_BOUNDS,
  initialView: LAKE_DISTRICT_INITIAL_VIEW,
  hasHillLighting: true,
  loadPeaks: async () => (await import('./wainwrights.json')).default.peaks,
};

// The shared camera style (bearing/pitch) matches the Wainwrights view.
// Every list is covered by the generated UK-wide lighting profiles; only
// the Wainwrights additionally draw the Lake District boundary layers.

const munros: HillListDefinition = {
  id: 'munros',
  name: 'Munros',
  regionLabel: 'Scottish Highlands',
  peakNoun: 'mountains',
  bounds: [
    [-6.6, 56.0],
    [-2.7, 58.7],
  ],
  initialView: {
    longitude: -4.65,
    latitude: 57.35,
    zoom: 6.5,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./munros.json')).default.peaks,
};

const corbetts: HillListDefinition = {
  id: 'corbetts',
  name: 'Corbetts',
  regionLabel: 'Scottish Highlands & Islands',
  peakNoun: 'hills',
  bounds: [
    [-7.1, 54.95],
    [-2.5, 58.75],
  ],
  initialView: {
    longitude: -4.8,
    latitude: 56.85,
    zoom: 6.3,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./corbetts.json')).default.peaks,
};

const grahams: HillListDefinition = {
  id: 'grahams',
  name: 'Grahams',
  regionLabel: 'Scotland',
  peakNoun: 'hills',
  bounds: [
    [-7.6, 54.8],
    [-2.5, 58.6],
  ],
  initialView: {
    longitude: -5.05,
    latitude: 56.7,
    zoom: 6.3,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./grahams.json')).default.peaks,
};

const donalds: HillListDefinition = {
  id: 'donalds',
  name: 'Donalds',
  regionLabel: 'Southern Scotland',
  peakNoun: 'hills',
  bounds: [
    [-4.85, 54.8],
    [-2.0, 56.5],
  ],
  initialView: {
    longitude: -3.4,
    latitude: 55.6,
    zoom: 7.4,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./donalds.json')).default.peaks,
};

// Lists whose published scope crosses the British Isles are trimmed to the
// UK (plus the Isle of Man where the published list includes it); Republic
// of Ireland and Channel Islands hills are excluded by the data build —
// see scripts/build-peak-data.ts.

const ethels: HillListDefinition = {
  id: 'ethels',
  name: 'Ethels',
  regionLabel: 'Peak District',
  peakNoun: 'hills',
  bounds: [
    [-2.2, 53.0],
    [-1.5, 53.62],
  ],
  initialView: {
    longitude: -1.85,
    latitude: 53.32,
    zoom: 8.9,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./ethels.json')).default.peaks,
};

const hewitts: HillListDefinition = {
  id: 'hewitts',
  name: 'Hewitts',
  regionLabel: 'England, Wales & Northern Ireland',
  peakNoun: 'mountains',
  bounds: [
    [-7.9, 50.6],
    [-1.75, 55.55],
  ],
  initialView: {
    longitude: -3.9,
    latitude: 53.2,
    zoom: 6.0,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./hewitts.json')).default.peaks,
};

const marilyns: HillListDefinition = {
  id: 'marilyns',
  name: 'Marilyns',
  regionLabel: 'UK & Isle of Man',
  peakNoun: 'hills',
  bounds: [
    [-8.7, 50.1],
    [0.65, 60.9],
  ],
  initialView: {
    longitude: -4.0,
    latitude: 55.0,
    zoom: 5.0,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./marilyns.json')).default.peaks,
};

// The subsidiary-top lists share their parents' regions and camera framing.

const munroTops: HillListDefinition = {
  id: 'munro-tops',
  name: 'Munro Tops',
  regionLabel: 'Scottish Highlands',
  peakNoun: 'tops',
  bounds: [
    [-6.7, 56.05],
    [-2.9, 58.4],
  ],
  initialView: {
    longitude: -4.7,
    latitude: 57.2,
    zoom: 6.6,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./munro-tops.json')).default.peaks,
};

const corbettTops: HillListDefinition = {
  id: 'corbett-tops',
  name: 'Corbett Tops',
  regionLabel: 'Scottish Highlands & Islands',
  peakNoun: 'tops',
  bounds: [
    [-6.8, 54.95],
    [-2.6, 58.7],
  ],
  initialView: {
    longitude: -4.7,
    latitude: 56.85,
    zoom: 6.3,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./corbett-tops.json')).default.peaks,
};

const grahamTops: HillListDefinition = {
  id: 'graham-tops',
  name: 'Graham Tops',
  regionLabel: 'Scotland',
  peakNoun: 'tops',
  bounds: [
    [-7.4, 54.75],
    [-1.95, 58.65],
  ],
  initialView: {
    longitude: -4.7,
    latitude: 56.7,
    zoom: 6.3,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./graham-tops.json')).default.peaks,
};

const donaldTops: HillListDefinition = {
  id: 'donald-tops',
  name: 'Donald Tops',
  regionLabel: 'Southern Scotland',
  peakNoun: 'tops',
  bounds: [
    [-4.85, 54.8],
    [-1.95, 56.5],
  ],
  initialView: {
    longitude: -3.4,
    latitude: 55.6,
    zoom: 7.4,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./donald-tops.json')).default.peaks,
};

const furths: HillListDefinition = {
  id: 'furths',
  name: 'Furths',
  regionLabel: 'England & Wales',
  peakNoun: 'mountains',
  bounds: [
    [-4.4, 52.9],
    [-2.75, 54.85],
  ],
  initialView: {
    longitude: -3.55,
    latitude: 53.85,
    zoom: 6.7,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./furths.json')).default.peaks,
};

const nuttalls: HillListDefinition = {
  id: 'nuttalls',
  name: 'Nuttalls',
  regionLabel: 'England & Wales',
  peakNoun: 'mountains',
  bounds: [
    [-4.6, 50.5],
    [-1.6, 55.7],
  ],
  initialView: {
    longitude: -3.0,
    latitude: 53.1,
    zoom: 5.9,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./nuttalls.json')).default.peaks,
};

// The Outlying Fells range beyond the park boundary (Humphrey Head reaches
// the Morecambe Bay coast), so they carry their own slightly wider bounds
// and no national-park framing.
const wainwrightOutlyingFells: HillListDefinition = {
  id: 'wainwright-outlying-fells',
  name: 'Wainwright Outlying Fells',
  regionLabel: 'Lake District',
  peakNoun: 'fells',
  bounds: [
    [-3.65, 54.06],
    [-2.55, 54.86],
  ],
  initialView: {
    longitude: -3.1,
    latitude: 54.45,
    zoom: 8.4,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () =>
    (await import('./wainwright-outlying-fells.json')).default.peaks,
};

const birketts: HillListDefinition = {
  id: 'birketts',
  name: 'Birketts',
  regionLabel: 'Lake District',
  peakNoun: 'fells',
  bounds: LAKE_DISTRICT_BOUNDS,
  initialView: LAKE_DISTRICT_INITIAL_VIEW,
  hasHillLighting: true,
  loadPeaks: async () => (await import('./birketts.json')).default.peaks,
};

const fellrangers: HillListDefinition = {
  id: 'fellrangers',
  name: 'Fellrangers',
  regionLabel: 'Lake District',
  peakNoun: 'fells',
  bounds: LAKE_DISTRICT_BOUNDS,
  initialView: LAKE_DISTRICT_INITIAL_VIEW,
  hasHillLighting: true,
  loadPeaks: async () => (await import('./fellrangers.json')).default.peaks,
};

const deweys: HillListDefinition = {
  id: 'deweys',
  name: 'Deweys',
  regionLabel: 'England, Wales & Isle of Man',
  peakNoun: 'hills',
  bounds: [
    [-5.1, 50.3],
    [-1.45, 55.75],
  ],
  initialView: {
    longitude: -3.3,
    latitude: 53.0,
    zoom: 5.9,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./deweys.json')).default.peaks,
};

const humps: HillListDefinition = {
  id: 'humps',
  name: 'HuMPs',
  regionLabel: 'UK & Isle of Man',
  peakNoun: 'hills',
  bounds: [
    [-8.9, 49.95],
    [1.4, 61.0],
  ],
  initialView: {
    longitude: -4.0,
    latitude: 55.0,
    zoom: 5.0,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./humps.json')).default.peaks,
};

const simms: HillListDefinition = {
  id: 'simms',
  name: 'Simms',
  regionLabel: 'UK & Isle of Man',
  peakNoun: 'hills',
  bounds: [
    [-8.2, 50.45],
    [-1.6, 58.7],
  ],
  initialView: {
    longitude: -4.2,
    latitude: 55.3,
    zoom: 5.4,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./simms.json')).default.peaks,
};

const countyTops: HillListDefinition = {
  id: 'county-tops',
  name: 'County Tops',
  regionLabel: 'Historic counties',
  peakNoun: 'summits',
  bounds: [
    [-8.2, 50.4],
    [1.6, 60.8],
  ],
  initialView: {
    longitude: -2.8,
    latitude: 54.3,
    zoom: 5.0,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./county-tops.json')).default.peaks,
};

const trail100: HillListDefinition = {
  id: 'trail-100',
  name: 'Trail 100',
  regionLabel: 'United Kingdom',
  peakNoun: 'peaks',
  bounds: [
    [-6.7, 50.5],
    [-0.85, 58.65],
  ],
  initialView: {
    longitude: -3.7,
    latitude: 54.5,
    zoom: 5.3,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () => (await import('./trail-100.json')).default.peaks,
};

const SOURCE_HILL_LISTS: readonly HillListDefinition[] = [
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
];

// The published lists overlap — a Wainwright can also be a Hewitt and a
// Marilyn — so the default view collates every registered list into one
// deduplicated UK-wide set. Progress is keyed by peak id, so a peak bagged
// here is bagged in every list that contains it (and vice versa). The
// bounds cover the union of the source lists: the HuMPs reach furthest
// west and north, the historic county tops furthest east.
const allPeaks: HillListDefinition = {
  id: 'all',
  name: 'All peaks',
  regionLabel: 'United Kingdom',
  peakNoun: 'peaks',
  bounds: [
    [-8.9, 49.95],
    [1.6, 61.0],
  ],
  initialView: {
    longitude: -4.0,
    latitude: 55.0,
    zoom: 5.0,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: async () =>
    mergePeakLists(
      await Promise.all(SOURCE_HILL_LISTS.map((list) => list.loadPeaks())),
    ),
};

export const HILL_LISTS: readonly HillListDefinition[] = [
  allPeaks,
  ...SOURCE_HILL_LISTS,
];

const DEFAULT_HILL_LIST: HillListDefinition = allPeaks;

export function isHillListId(value: unknown): value is HillListId {
  return typeof value === 'string' && HILL_LIST_IDS.some((id) => id === value);
}

/** Resolves a list id to its definition, falling back to the default list. */
export function getHillList(id: string): HillListDefinition {
  return HILL_LISTS.find((list) => list.id === id) ?? DEFAULT_HILL_LIST;
}
