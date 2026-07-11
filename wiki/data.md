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

The generation command is:

```sh
npm run data:peaks
```

The script downloads the DoBIH CSV ZIP once and builds one file per list from
a small per-list config: the DoBIH classification flag column (`W`, `M`, `C`,
`G`, `D`, `E`, `Hew`, `Ma`), the exact published count, a summit-height sanity
band and spot checks for well-known hills. The Hewitts and Marilyns are
British-Isles-wide classifications in DoBIH, so their configs also carry a
scope filter that keeps UK hills (identifying Northern Ireland by its
local-government districts, since DoBIH marks the whole island of Ireland as
one country) plus the Isle of Man, and excludes the Republic of Ireland.
DoBIH hill `Number` is preserved as `dobihId` and is also used to build the
app `id`. A peak's `list` array records every configured list it belongs
to — some Corbetts and Grahams are also Donalds, and most Wainwrights are
also Hewitts or Marilyns — so a shared peak keeps one identity and one
progress record across lists.

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

Summits are treated as WGS84 point coordinates. They remain the source of
identity and selection, but they are not the primary visible map mark.

Bagged peaks light a generated hill-profile polygon rather than only the
summit marker. The committed file is:

- `src/data/boundaries/wainwright-areas.geojson`

The generation command is:

```sh
npm run data:hill-boundaries
```

This model builds one summit-centred profile per Wainwright, shapes it by height
and nearby summits, then clips it to the Lake District National Park boundary.
The committed geometries are designed for visual hill lighting: roads, paths,
streams, hillshade and contours remain visible from the basemap so the user can
read the topography beneath the profile layer. They are not authoritative legal,
route or geomorphological boundaries.

## Hill lists

The lists Munro can track are described by a small registry:

- `src/data/lists.ts`

Each entry declares the list's id, display name, region label, map-fit
bounds and initial camera, whether generated hill-lighting profiles exist
for it, and a lazy loader for its peak-data module. Peak data is loaded with
a dynamic import, so the app bundle does not grow as lists are added.

Adding a hill list is a data-only change: commit its generated peak JSON
under `src/data/` and add one registry entry. No store, component or map
refactor should be required.

The active list is a persisted user preference (defaulting to Wainwrights)
and is switched from the tracker's peak list panel. Progress records are
keyed by the globally unique peak id (`dobih-N`), so each list's progress
coexists in the same store and switching lists never touches existing
records; stats are computed against the active list's peaks only.

Hill lighting is per-list: only lists with generated profiles (currently
the Wainwrights) render the lighting and boundary layers. Lists without
profiles fall back to summit markers alone — the Munros, Corbetts, Grahams,
Donalds, Ethels, Hewitts and Marilyns all render this way today, framed by
each list's map-fit bounds from the registry (from the Peak District up to
the whole UK for the Marilyns).

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
