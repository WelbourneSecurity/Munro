# Data strategy

Munro is local-first, but the source data is not casual. The app commits
reviewed static data files and validates them in tests so the map can render
without runtime API keys or hidden services.

## Peak data

Peak datasets are generated from the Database of British and Irish Hills
(DoBIH) v18.4 CSV download. The committed files are:

- `src/data/wainwrights.json` — 214 Wainwrights
- `src/data/munros.json` — 282 Munros
- `src/data/corbetts.json` — 222 Corbetts
- `src/data/grahams.json` — 231 Grahams
- `src/data/donalds.json` — 89 Donalds
- `src/data/ethels.json` — 95 Ethels (Peak District)
- `src/data/hewitts.json` — 336 Hewitts (England, Wales & Northern Ireland)
- `src/data/marilyns.json` — 1,621 Marilyns (UK & Isle of Man)
- `src/data/munro-tops.json` — 226 Munro Tops
- `src/data/corbett-tops.json` — 453 Corbett Tops
- `src/data/graham-tops.json` — 844 Graham Tops
- `src/data/donald-tops.json` — 52 Donald Tops
- `src/data/furths.json` — 21 Furths (England & Wales)
- `src/data/nuttalls.json` — 442 Nuttalls (England & Wales)
- `src/data/wainwright-outlying-fells.json` — 116 Wainwright Outlying Fells
- `src/data/birketts.json` — 541 Birketts (Lake District)
- `src/data/fellrangers.json` — 230 Fellrangers (Lake District)
- `src/data/deweys.json` — 425 Deweys (England, Wales & Isle of Man)
- `src/data/humps.json` — 3,096 HuMPs (UK & Isle of Man)
- `src/data/simms.json` — 2,552 Simms (UK & Isle of Man)
- `src/data/county-tops.json` — 90 historic county tops
- `src/data/trail-100.json` — 100 Trail 100 peaks

Lists whose published scope crosses the British Isles are trimmed to the
UK and Isle of Man: Republic of Ireland hills are excluded everywhere, and
the Channel Islands' HuMPs are excluded too. The TuMPs (~17,000 hills) are
deliberately not shipped — roughly tripling the app's data for the most
completist list contradicts the product's restraint — and the New Donalds
cannot be generated because DoBIH's CSV download carries no flag column
for them.

The generation command is:

```sh
npm run data:peaks
```

The script downloads the DoBIH CSV ZIP, filters rows where the `W` flag is
set, and validates that the output contains exactly 214 Wainwrights with
unique stable identifiers. DoBIH hill `Number` is preserved as the numeric
`dobihId` and is also used to build the app `id` (`dobih-<number>`).

Each peak record follows this schema (the authoritative Zod version lives in
`src/domain/schemas.ts`):

```ts
type Peak = {
  id: string;
  dobihId: number;
  name: string;
  list: string[];
  region: string;
  nationalPark?: string;
  heightM: number;
  heightFt?: number;
  lat: number;
  lon: number;
  gridRef?: string;
  source?: string;
};
```

Summits are treated as authoritative WGS84 point coordinates and are the source
of identity, selection and map status. The map presents them as survey diamonds:
hollow for open, solid for bagged and a double reticle when selected.

The historical generated profile file remains committed for data-pipeline
compatibility:

- `src/data/boundaries/hill-areas.geojson`

The generation command is:

```sh
npm run data:hill-boundaries
```

This model builds approximate summit-centred profiles. They are not authoritative
legal, route or geomorphological boundaries, are not imported into the application
runtime and must never be presented as the real shape of a hill.

## Hill lists

The lists Munro can track are described by a small registry:

- `src/data/lists.ts`

Each entry declares the list's id, display name, region label, map-fit
bounds and initial camera, and a lazy loader for its peak-data module. Peak data is loaded with
a dynamic import, so the app bundle does not grow as lists are added.

Adding a hill list is a data-only change: commit its generated peak JSON
under `src/data/` and add one registry entry. No store, component or map
refactor should be required. A new source list also flows into the
collated **All peaks** view automatically (and changes its expected count
in `src/data/lists.test.ts`), because that view is built from the registry
rather than its own data file.

The source of every geographic edition is the collated **All peaks** list: every registered
source list merged and deduplicated by peak id (the published lists
overlap — a Wainwright can also be a Hewitt and a Marilyn — so it holds
one record per distinct hill, with the union of its list memberships).
The range-edition registry in `src/domain/editions.ts` groups that national
set by complete DoBIH sections (or explicit list membership for the combined
Wainwright and Outlying Fell edition), then calculates padded bounds from the
edition's actual summits. The active edition is stored separately as
`munro.range.v1`. Progress records are
keyed by the globally unique peak id (`dobih-N`), so each list's progress
coexists in the same store and switching editions never touches existing
records; stats are computed against the active edition only.

The Lake District boundary layers render only on the Wainwrights edition. Every
edition is fitted to its calculated data extent, from the Isle of Man to the
whole UK. Authoritative summit markers carry selection and status throughout.

## Boundary data

The Lake District boundary is generated from Natural England's National Parks
(England) FeatureServer and committed as:

- `src/data/boundaries/lake-district.geojson`

The generation command is:

```sh
npm run data:boundary
```

The script requests the Lake District feature in WGS84 GeoJSON with server-side
simplification appropriate for tracker map zooms. Tests verify that the file is
a single polygon with coordinates inside the expected Lake District extent.

## Progress data

User progress is separate from source peak data:

```ts
type PeakProgress = {
  peakId: string;
  bagged: boolean;
  baggedDate?: string;
  notes?: string;
};
```

Keeping source data and user progress separate is a firm architectural rule:
it keeps hill lists a data-only concern, makes backup and restore trivial, and
leaves the door open for cloud sync later without a migration.

Backups use a versioned envelope:

```ts
type Backup = {
  version: number;
  exportedAt: string;
  progress: PeakProgress[];
};
```

`baggedDate` is an ISO date (`YYYY-MM-DD`) and `exportedAt` an ISO
timestamp. Imports are validated with Zod (`src/domain/schemas.ts`) before
replacing local progress, so corrupt backup files cannot partially mutate
the store.

## Map data and attribution

The basemap uses OpenFreeMap's public dark MapLibre style with the vector tile
source isolated in `src/map/config.ts` so it can be swapped for a self-hosted
fallback if needed.

Terrain uses AWS Terrain Tiles in Terrarium format. The map renders a subdued
hillshade from the DEM and uses `maplibre-contour` to generate contour vector
tiles in the browser. Terrain is a user preference stored locally, because it
is visual context rather than source peak data.

Attribution text is centralized in `src/data/attribution.ts` and rendered from
constants. Do not hand-copy or lightly rewrite it in components. The current
attribution set covers:

- Database of British and Irish Hills, CC BY 4.0
- OpenFreeMap and OpenStreetMap contributors
- AWS Terrain Tiles / Mapzen terrain sources
- Natural England boundary data, OGL v3.0

Any exported image must include the same data attribution in the image pixels,
because a WebGL canvas capture does not include the DOM attribution control.
