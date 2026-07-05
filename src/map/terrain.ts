import maplibregl from 'maplibre-gl';
import mlcontour from 'maplibre-contour';

import { AWS_TERRARIUM_TILE_URL } from './config';

const TERRAIN_PROTOCOL_FLAG = '__munroTerrainProtocolRegistered';

type TerrainGlobal = typeof globalThis & {
  [TERRAIN_PROTOCOL_FLAG]?: boolean;
};

type DemSource = InstanceType<typeof mlcontour.DemSource>;

export const terrainDemSource: DemSource = new mlcontour.DemSource({
  url: AWS_TERRARIUM_TILE_URL,
  encoding: 'terrarium',
  maxzoom: 13,
  worker: true,
  cacheSize: 100,
  timeoutMs: 10_000,
});

export function setupTerrainProtocols() {
  const terrainGlobal = globalThis as TerrainGlobal;

  if (terrainGlobal[TERRAIN_PROTOCOL_FLAG]) {
    return;
  }

  terrainDemSource.setupMaplibre(maplibregl);
  terrainGlobal[TERRAIN_PROTOCOL_FLAG] = true;
}

export const contourTileUrl = terrainDemSource.contourProtocolUrl({
  thresholds: {
    9: [50, 250],
    10: [25, 100],
    11: [25, 100],
    12: [10, 50],
    13: [10, 50],
    14: [10, 50],
    15: [5, 25],
    16: [5, 25],
  },
  elevationKey: 'ele',
  levelKey: 'level',
  contourLayer: 'contours',
  overzoom: 1,
});
