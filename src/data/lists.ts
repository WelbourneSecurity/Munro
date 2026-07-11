import type { Peak } from '../domain';

/**
 * Registry of the hill lists Munro can track.
 *
 * Adding a list is a data-only change: commit its generated peak JSON under
 * `src/data/`, then add one entry (and its id) here. No component, store or
 * map refactor should be required.
 */

export const HILL_LIST_IDS = ['wainwrights'] as const;

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

export const HILL_LISTS: readonly HillListDefinition[] = [wainwrights];

const DEFAULT_HILL_LIST: HillListDefinition = wainwrights;

export function isHillListId(value: unknown): value is HillListId {
  return typeof value === 'string' && HILL_LIST_IDS.some((id) => id === value);
}

/** Resolves a list id to its definition, falling back to the default list. */
export function getHillList(id: string): HillListDefinition {
  return HILL_LISTS.find((list) => list.id === id) ?? DEFAULT_HILL_LIST;
}
