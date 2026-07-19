import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AttributionControl,
  Layer,
  Map,
  NavigationControl,
  Source,
} from '@vis.gl/react-maplibre';
import type { MapLayerMouseEvent, MapRef } from '@vis.gl/react-maplibre';
import type { FeatureCollection, Polygon } from 'geojson';
import type { StyleSpecification, TerrainSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { ExportDialog } from '../components';
import boundaryRaw from '../data/boundaries/lake-district.geojson?raw';
import { mapAttributionHtml } from '../data/attribution';
import type { HillListDefinition } from '../data/lists';
import { peaksToGeoJSON, type Peak, type ProgressStats } from '../domain';
import { usePreferencesStore, useProgressStore } from '../store';
import {
  LIST_FIT_OPTIONS,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  OPENFREEMAP_VECTOR_SOURCE_URL,
  listMaxBounds,
} from './config';
import {
  CONTOURS_ANCHOR_ID,
  HILL_LIGHTING_ANCHOR_ID,
  HILLSHADE_ANCHOR_ID,
  boundaryFillLayer,
  boundaryLineLayer,
  peakHitboxLayer,
  selectedPeakLabelLayer,
  selectedPeakMarkerLayer,
  surveyPeakMarkerLayer,
  terrainContourLabelLayer,
  terrainContourLayer,
  terrainHillshadeLayer,
} from './layers';
import munroDarkStyle from './style/munro-dark.json';
import { getMapSupportError } from './support';
import { contourTileUrl, setupTerrainProtocols, terrainDemSource } from './terrain';

interface MapViewProps {
  list: HillListDefinition;
  peaks: Peak[];
  stats: ProgressStats;
  selectedPeakId: string | undefined;
  onSelectPeak: (peakId: string) => void;
}
type BoundaryData = FeatureCollection<Polygon> & { metadata?: Record<string, unknown> };
const boundaryData = JSON.parse(boundaryRaw) as BoundaryData;
const TERRAIN_OPTIONS: TerrainSpecification = {
  source: 'terrain-dem',
  exaggeration: 1.2,
};
const TERRAIN_DISABLED = null as unknown as TerrainSpecification;
setupTerrainProtocols();

export function MapView({
  list,
  peaks,
  stats,
  selectedPeakId,
  onSelectPeak,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const progressByPeakId = useProgressStore((state) => state.progressByPeakId);
  const terrainEnabled = usePreferencesStore((state) => state.terrainEnabled);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const mapSupportError = useMemo(() => getMapSupportError(), []);
  const getMap = useCallback(() => mapRef.current?.getMap() ?? null, []);
  const progress = useMemo(() => Object.values(progressByPeakId), [progressByPeakId]);
  const peakGeoJson = useMemo(() => {
    const collection = peaksToGeoJSON(peaks, progress);
    return {
      ...collection,
      features: collection.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          selected: feature.properties.id === selectedPeakId,
        },
      })),
    };
  }, [peaks, progress, selectedPeakId]);
  const maxBounds = useMemo(() => listMaxBounds(list.bounds), [list]);
  const mapStyle = useMemo<StyleSpecification>(
    () =>
      ({
        ...munroDarkStyle,
        sources: {
          ...munroDarkStyle.sources,
          openmaptiles: {
            ...munroDarkStyle.sources.openmaptiles,
            url: OPENFREEMAP_VECTOR_SOURCE_URL,
          },
        },
      }) as StyleSpecification,
    [],
  );

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.fitBounds(list.bounds, {
      ...LIST_FIT_OPTIONS,
      bearing: list.initialView.bearing,
      pitch: list.initialView.pitch,
      duration: reduceMotion ? 0 : 600,
    });
  }, [list, mapReady]);

  useEffect(() => {
    if (!selectedPeakId || !mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const peak = peaks.find((candidate) => candidate.id === selectedPeakId);
    if (!peak) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo({
      center: [peak.lon, peak.lat],
      zoom: Math.max(map.getZoom(), 11),
      duration: reduceMotion ? 0 : 420,
    });
  }, [mapReady, peaks, selectedPeakId]);

  function handlePeakClick(event: MapLayerMouseEvent) {
    const peakId = event.features?.[0]?.properties.id as string | undefined;
    if (peakId) onSelectPeak(peakId);
  }

  if (mapSupportError) {
    return (
      <div className="flex h-full items-center justify-center px-6" role="status">
        <div className="border-ink bg-bone text-ink max-w-md border p-5">
          <p className="font-semibold">Map unavailable</p>
          <p className="text-stone mt-3 text-sm leading-6">{mapSupportError}</p>
          <a
            className="focus-ring mt-4 inline-flex min-h-11 items-center underline underline-offset-4"
            href="#/logbook"
          >
            Open the accessible logbook
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <Map
        ref={mapRef}
        attributionControl={false}
        canvasContextAttributes={{ preserveDrawingBuffer: true }}
        initialViewState={{
          ...list.initialView,
          bounds: list.bounds,
          fitBoundsOptions: LIST_FIT_OPTIONS,
        }}
        interactiveLayerIds={['peak-hitbox']}
        mapStyle={mapStyle}
        maxBounds={maxBounds}
        maxPitch={68}
        maxZoom={MAP_MAX_ZOOM}
        minZoom={MAP_MIN_ZOOM}
        onClick={handlePeakClick}
        onError={() => {
          if (!mapReady) setMapFailed(true);
        }}
        onLoad={() => {
          setMapReady(true);
          setMapFailed(false);
        }}
        style={{ width: '100%', height: '100%' }}
        terrain={terrainEnabled ? TERRAIN_OPTIONS : TERRAIN_DISABLED}
      >
        <AttributionControl compact customAttribution={mapAttributionHtml()} />
        <NavigationControl position="top-right" showCompass />
        <Source
          id="terrain-dem"
          type="raster-dem"
          tiles={[terrainDemSource.sharedDemProtocolUrl]}
          encoding="terrarium"
          maxzoom={13}
          tileSize={256}
        />
        {terrainEnabled ? (
          <Source
            id="terrain-hillshade-dem"
            type="raster-dem"
            tiles={[terrainDemSource.sharedDemProtocolUrl]}
            encoding="terrarium"
            maxzoom={13}
            tileSize={256}
          >
            <Layer {...terrainHillshadeLayer} beforeId={HILLSHADE_ANCHOR_ID} />
          </Source>
        ) : null}
        {list.id === 'wainwrights' ? (
          <Source id="lake-district-boundary" type="geojson" data={boundaryData}>
            <Layer {...boundaryFillLayer} beforeId={HILL_LIGHTING_ANCHOR_ID} />
            <Layer {...boundaryLineLayer} beforeId={HILL_LIGHTING_ANCHOR_ID} />
          </Source>
        ) : null}
        {terrainEnabled ? (
          <Source
            id="terrain-contours"
            type="vector"
            tiles={[contourTileUrl]}
            maxzoom={16}
          >
            <Layer {...terrainContourLayer} beforeId={CONTOURS_ANCHOR_ID} />
            <Layer {...terrainContourLabelLayer} beforeId={CONTOURS_ANCHOR_ID} />
          </Source>
        ) : null}
        <Source id="list-peaks" type="geojson" data={peakGeoJson}>
          <Layer {...peakHitboxLayer} />
          <Layer {...surveyPeakMarkerLayer} />
          <Layer {...selectedPeakMarkerLayer} />
          <Layer {...selectedPeakLabelLayer} />
        </Source>
      </Map>
      {!mapReady && !mapFailed ? (
        <div
          className="bg-ink/88 text-bone pointer-events-none absolute top-3 right-16 z-10 px-3 py-2 md:top-5"
          role="status"
        >
          <p className="font-label text-[0.6rem]">LOADING TERRAIN</p>
        </div>
      ) : null}
      {mapFailed ? (
        <div
          className="bg-bone text-ink border-ink absolute top-1/2 left-1/2 z-10 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 border p-5"
          role="alert"
        >
          <p className="font-semibold">The map could not load.</p>
          <p className="text-stone mt-2 text-sm">Your logbook remains available.</p>
          <a
            className="focus-ring mt-4 inline-flex min-h-11 items-center underline"
            href="#/logbook"
          >
            Open the logbook
          </a>
        </div>
      ) : null}
      <button
        className="focus-ring bg-bone text-ink border-ink absolute right-3 bottom-12 z-10 min-h-11 border px-4 text-sm font-semibold md:right-5 md:bottom-16"
        type="button"
        onClick={() => {
          setExportOpen(true);
        }}
      >
        Export image
      </button>
      <ExportDialog
        open={exportOpen}
        getMap={getMap}
        list={list}
        stats={{ bagged: stats.bagged, total: stats.total }}
        onClose={() => {
          setExportOpen(false);
        }}
      />
    </>
  );
}
