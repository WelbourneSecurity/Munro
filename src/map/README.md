# Munro map

Runtime MapLibre imports stay inside this directory: `MapView.tsx` is the
only module that imports `@vis.gl/react-maplibre`, and `terrain.ts` imports
`maplibre-gl` directly only to register the shared DEM protocol. Modules
outside `src/map/` may import MapLibre types only.

The base style in `style/munro-dark.json` is a committed fork of OpenFreeMap's
Dark style (`https://tiles.openfreemap.org/styles/dark`). Keep the fork close to
upstream and apply Munro-specific source overlays in code:

- Lake District boundary from `src/data/boundaries/lake-district.geojson`.
- Generated Wainwright hill-profile polygons from
  `src/data/boundaries/wainwright-areas.geojson`.
- Wainwright summit points from `src/data/wainwrights.json`.
- AWS Terrarium DEM tiles for hillshade.
- Client-generated contour lines from `maplibre-contour`.
- Attribution strings from `src/data/attribution.ts`.

The vector-tile source URL is isolated in `config.ts`. If the public OpenFreeMap
instance stops fitting the MVP, replace that URL with a self-hosted
PMTiles/OpenMapTiles endpoint rather than editing map components.

The terrain source URL and fallback note live in `config.ts`; protocol setup for
shared DEM tiles and contour generation lives in `terrain.ts`. Hill lighting
uses generated summit-centred hill profiles clipped to the Lake District
boundary. Do not describe those polygons as authoritative mountain boundaries;
they are approximate visual profiles for the bagged-hill lighting layer.

To edit the style, open `style/munro-dark.json` in Maputnik or another MapLibre
style editor, keep the palette dark and restrained, and run `npm run verify`
after saving.
