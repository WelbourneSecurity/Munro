# Data scripts

These scripts refresh committed source data. They are manual maintenance tools,
not CI steps.

## Hill-list peak data

```sh
npm run data:peaks                   # all lists
npm run data:peaks -- munros donalds # a subset
```

`scripts/build-peak-data.ts` downloads the DoBIH `hillcsv.zip` once and builds
one JSON file per configured hill list. Each list is driven by a small config
naming its DoBIH classification flag column (`W` Wainwright, `M` Munro,
`C` Corbett, `G` Graham, `D` Donald, `E` Ethel, `Hew` Hewitt, `Ma` Marilyn —
each a 0/1 column in the CSV), its exact published count, a summit-height
sanity band and well-known spot checks. The Hewitts and Marilyns configs add
a UK scope filter (Northern Ireland identified by its local-government
districts; Republic of Ireland excluded; Isle of Man kept). Every mapped
record is validated with the app `Peak` schema. The committed files are:

- `src/data/wainwrights.json` — 214 Wainwrights
- `src/data/munros.json` — 282 Munros
- `src/data/corbetts.json` — 222 Corbetts
- `src/data/grahams.json` — 231 Grahams
- `src/data/donalds.json` — 89 Donalds
- `src/data/ethels.json` — 95 Ethels
- `src/data/hewitts.json` — 336 Hewitts
- `src/data/marilyns.json` — 1,621 Marilyns

A peak's `list` array records every configured list it belongs to (some
Corbetts and Grahams are also Donalds, and most Wainwrights are also Hewitts
or Marilyns), so progress on a shared peak follows it across lists. Files whose content is unchanged apart from `generatedAt`
are left untouched. The generated metadata records that each file is trimmed
and reformatted from DoBIH v18.4 under CC BY 4.0.

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
