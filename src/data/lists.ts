import type { Peak } from '../domain';

/**
 * Registry of the hill lists Munro can track.
 *
 * Adding a list is a data-only change: commit its generated peak JSON under
 * `src/data/`, then add one entry (and its id) here. No component, store or
 * map refactor should be required.
 */

export const HILL_LIST_IDS = [
  'wainwrights',
  'munros',
  'corbetts',
  'grahams',
  'donalds',
] as const;

export type HillListId = (typeof HILL_LIST_IDS)[number];

export const DEFAULT_HILL_LIST_ID: HillListId = 'wainwrights';

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
   * Whether generated hill-lighting profiles (and a matching boundary layer)
   * exist for this list. Lists without profiles fall back to summit markers
   * only — lighting layers must no-op cleanly.
   */
  hasHillLighting: boolean;
  /** Lazily loads the list's peak data so bundles don't grow per list. */
  loadPeaks: () => Promise<Peak[]>;
}

export const LAKE_DISTRICT_BOUNDS: HillListBounds = [
  [-3.58, 54.18],
  [-2.72, 54.82],
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

// The Scottish lists have no generated hill-lighting profiles or park
// boundary yet, so they render summit markers only (hasHillLighting: false).
// The shared camera style (bearing/pitch) matches the Wainwrights view.

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
  hasHillLighting: false,
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
  hasHillLighting: false,
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
  hasHillLighting: false,
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
  hasHillLighting: false,
  loadPeaks: async () => (await import('./donalds.json')).default.peaks,
};

export const HILL_LISTS: readonly HillListDefinition[] = [
  wainwrights,
  munros,
  corbetts,
  grahams,
  donalds,
];

const DEFAULT_HILL_LIST: HillListDefinition = wainwrights;

export function isHillListId(value: unknown): value is HillListId {
  return typeof value === 'string' && HILL_LIST_IDS.some((id) => id === value);
}

/** Resolves a list id to its definition, falling back to the default list. */
export function getHillList(id: string): HillListDefinition {
  return HILL_LISTS.find((list) => list.id === id) ?? DEFAULT_HILL_LIST;
}
