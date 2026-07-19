# Munro map

Runtime MapLibre imports stay inside this directory: `MapView.tsx` is the
only module that imports `@vis.gl/react-maplibre`, and `terrain.ts` imports
`maplibre-gl` directly only to register the shared DEM protocol. Modules
outside `src/map/` may import MapLibre types only.

The base style in `style/munro-dark.json` is a committed fork of OpenFreeMap's
Dark style (`https://tiles.openfreemap.org/styles/dark`). Keep the fork close to
upstream and apply Munro-specific source overlays in code:

- Lake District boundary from `src/data/boundaries/lake-district.geojson`
  (rendered only for the Wainwright list).
- Historical generated hill-profile polygons remain in the data pipeline but
  are not rendered as real hill shapes.
- Summit points for the active hill list, loaded lazily through the registry
  in `src/data/lists.ts`, which also supplies each list's map-fit bounds and
  initial camera.
- AWS Terrarium DEM tiles for hillshade.
- Client-generated contour lines from `maplibre-contour`.
- Attribution strings from `src/data/attribution.ts`.

Three invisible no-op anchor layers (`munro-hillshade-anchor`,
`munro-hill-lighting-anchor`, `munro-contours-anchor`) are committed at the
top of `style/munro-dark.json`. Conditional overlay layers pass them as
`beforeId` so remounting (the Terrain toggle, hill-list switches) always
restores the fresh-load stacking order below the always-mounted peak layers.
Keep the anchors when refreshing the style fork from upstream.

The vector-tile source URL is isolated in `config.ts`. If the public OpenFreeMap
instance stops fitting the MVP, replace that URL with a self-hosted
PMTiles/OpenMapTiles endpoint rather than editing map components.

The terrain source URL and fallback note live in `config.ts`; protocol setup for
shared DEM tiles and contour generation lives in `terrain.ts`. The map uses
authoritative summit points and survey-style symbols for selection and status.
Generated profile polygons are not authoritative mountain boundaries and must
not be returned to the runtime UI.

To edit the style, open `style/munro-dark.json` in Maputnik or another MapLibre
style editor, keep the palette neutral and restrained, and run `npm run verify`
after saving.
