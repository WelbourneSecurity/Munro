# Data strategy

## Peak data

The peak dataset should be stored as structured local data first, for
example JSON or TypeScript data files.

Each record should follow a consistent schema:

```ts
type Peak = {
  id: string;
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

## Progress data

User progress should be separate from the source peak data:

```ts
type PeakProgress = {
  peakId: string;
  bagged: boolean;
  baggedDate?: string;
  notes?: string;
};
```

Keeping source data and user progress separate is a firm architectural
rule: it keeps hill lists a data-only concern, makes backup/restore trivial,
and leaves the door open for cloud sync later without a migration.

## Map data

The app should use reliable mapping data and respect licensing.

Preferred sources to investigate:

- [Ordnance Survey Data Hub](https://osdatahub.os.uk/)
- OS Maps API
- OS Terrain 50
- OS Terrain 5 if higher terrain detail is needed later
- [Database of British and Irish Hills](https://www.hills-database.co.uk/)
- Official national park boundary datasets where available

For the MVP, do not attempt to generate accurate "peak boundaries". Treat
peaks as summit points. Peak boundary lighting can be considered later using
terrain-derived catchments, prominence regions or Voronoi-style
approximations, but that is not needed for the first tracker.
