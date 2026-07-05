# Data scripts

These scripts refresh committed source data. They are manual maintenance tools,
not CI steps.

## Wainwrights

```sh
npm run data:peaks
```

`scripts/build-peak-data.ts` downloads the DoBIH `hillcsv.zip`, filters rows
where the `W` flag is `1`, validates every mapped record with the app `Peak`
schema, and writes `src/data/wainwrights.json`.

The output must contain exactly 214 Wainwrights. The generated metadata records
that the file is trimmed and reformatted from DoBIH v18.4 under CC BY 4.0.

## Lake District boundary

```sh
npm run data:boundary
```

`scripts/fetch-boundary.ts` fetches the Lake District polygon from Natural
England's National Parks (England) ArcGIS FeatureServer using WGS84 output and
server-side simplification. The committed file is
`src/data/boundaries/lake-district.geojson`.

## Wainwright hill-profile polygons

```sh
npm run data:hill-boundaries
```

`scripts/build-hill-boundaries.ts` builds one repeatable polygon per Wainwright
by generating a summit-centred hill profile from `src/data/wainwrights.json`,
shaping it by height and nearby summits, and clipping it to
`src/data/boundaries/lake-district.geojson`. The committed file is
`src/data/boundaries/wainwright-areas.geojson`.

This is a visual hill-lighting model, not an authoritative geomorphological,
route or land-boundary dataset.

After refreshing either file, run:

```sh
npm run test
npm run verify
```
