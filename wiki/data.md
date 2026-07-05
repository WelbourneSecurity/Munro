# Data strategy

Munro is local-first, but the source data is not casual. The app commits
reviewed static data files and validates them in tests so the map can render
without runtime API keys or hidden services.

## Peak data

The MVP Wainwright dataset is generated from the Database of British and
Irish Hills (DoBIH) v18.4 CSV download. The committed file is:

- `src/data/wainwrights.json`

The generation command is:

```sh
npm run data:peaks
```

The script downloads the DoBIH CSV ZIP, filters rows where the `W` flag is
set, and validates that the output contains exactly 214 Wainwrights with
unique stable identifiers. DoBIH hill `Number` is preserved as `dobihId` and
is also used to build the app `id`.

Each peak record follows this schema:

```ts
type Peak = {
  id: string;
  dobihId: string;
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

Imports are validated with Zod before replacing local progress, so corrupt
backup files cannot partially mutate the store.

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
