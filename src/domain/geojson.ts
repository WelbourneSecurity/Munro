import type { FeatureCollection, Point } from 'geojson';

import { getProgressMap } from './peaks';
import type { Peak, PeakProgress } from './schemas';

export interface PeakFeatureProperties {
  id: string;
  dobihId: number;
  name: string;
  region: string;
  heightM: number;
  heightFt?: number;
  gridRef?: string;
  bagged: boolean;
}

export type PeakFeatureCollection = FeatureCollection<Point, PeakFeatureProperties>;

export function peaksToGeoJSON(
  peaks: Peak[],
  progress: PeakProgress[],
): PeakFeatureCollection {
  const progressMap = getProgressMap(progress);

  return {
    type: 'FeatureCollection',
    features: peaks.map((peak) => {
      const peakProgress = progressMap.get(peak.id);

      return {
        type: 'Feature',
        id: peak.id,
        properties: {
          id: peak.id,
          dobihId: peak.dobihId,
          name: peak.name,
          region: peak.region,
          heightM: peak.heightM,
          bagged: peakProgress?.bagged === true,
          ...(peak.heightFt ? { heightFt: peak.heightFt } : {}),
          ...(peak.gridRef ? { gridRef: peak.gridRef } : {}),
        },
        geometry: {
          type: 'Point',
          coordinates: [peak.lon, peak.lat],
        },
      };
    }),
  };
}
