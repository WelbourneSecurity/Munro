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
import type { LngLatBoundsLike, TerrainSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { ExportDialog } from '../components';
import boundaryRaw from '../data/boundaries/lake-district.geojson?raw';
import { mapAttributionHtml } from '../data/attribution';
import {
  peaksToGeoJSON,
  type Peak,
  type ProgressStats,
  type RangeEditionView,
} from '../domain';
import { usePreferencesStore, useProgressStore } from '../store';
import type { CapturePosterMap, MapSnapshot, PosterCaptureRequest } from '../export';
import { LIST_FIT_OPTIONS, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from './config';
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
import { mapStyleForPalette } from './styles';
import { getMapSupportError } from './support';
import { contourTileUrl, setupTerrainProtocols, terrainDemSource } from './terrain';

interface MapViewProps {
  edition: RangeEditionView;
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
const FRAME_SETTLE_FALLBACK_MS = 2_000;
setupTerrainProtocols();

interface CaptureTask {
  request: PosterCaptureRequest;
  original: {
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
    minZoom: number;
    maxBounds: LngLatBoundsLike | null;
  };
  resolve: (snapshot: MapSnapshot) => void;
  reject: (error: unknown) => void;
}

type CaptureState =
  | { phase: 'capture'; task: CaptureTask }
  | {
      phase: 'restore';
      task: CaptureTask;
      result: { snapshot: MapSnapshot } | { error: unknown };
    };

function withAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined) {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(new DOMException('Poster capture cancelled', 'AbortError'));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(new DOMException('Poster capture cancelled', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export function MapView({
  edition,
  peaks,
  stats,
  selectedPeakId,
  onSelectPeak,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const progressByPeakId = useProgressStore((state) => state.progressByPeakId);
  const terrainEnabled = usePreferencesStore((state) => state.terrainEnabled);
  const visualPreset = usePreferencesStore((state) => state.visualPreset);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [framedEditionId, setFramedEditionId] = useState<string>();
  const [exportOpen, setExportOpen] = useState(false);
  const [captureState, setCaptureState] = useState<CaptureState>();
  const captureActiveRef = useRef(false);
  const mapSupportError = useMemo(() => getMapSupportError(), []);
  const progress = useMemo(() => Object.values(progressByPeakId), [progressByPeakId]);
  const baggedPeakKey = useMemo(
    () =>
      peaks
        .filter((peak) => progressByPeakId[peak.id]?.bagged === true)
        .map((peak) => peak.id)
        .sort()
        .join(','),
    [peaks, progressByPeakId],
  );
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
  const captureActive = captureState?.phase === 'capture';
  const activePalette = captureActive
    ? captureState.task.request.palette
    : visualPreset;
  const mapStyle = useMemo(() => mapStyleForPalette(activePalette), [activePalette]);
  const frameSequence = useRef(0);
  const frameLockTimer = useRef<number | undefined>(undefined);
  const resizeTimer = useRef<number | undefined>(undefined);
  const activeEditionId = useRef(edition.id);
  const baggedOnly = edition.id === 'uk' || captureActive;

  useEffect(() => {
    activeEditionId.current = edition.id;
  }, [edition.id]);

  const frameEdition = useCallback(() => {
    if (captureActiveRef.current) return;
    if (activeEditionId.current !== edition.id) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const sequence = ++frameSequence.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (frameLockTimer.current) window.clearTimeout(frameLockTimer.current);
    setFramedEditionId(undefined);
    map.stop();
    map.setMaxBounds(null);
    map.setMinZoom(MAP_MIN_ZOOM);

    const settle = () => {
      if (sequence !== frameSequence.current) return;
      if (frameLockTimer.current) window.clearTimeout(frameLockTimer.current);
      frameLockTimer.current = undefined;
      const visible = map.getBounds();
      map.setMaxBounds([
        [visible.getWest(), visible.getSouth()],
        [visible.getEast(), visible.getNorth()],
      ]);
      map.setMinZoom(map.getZoom());
      setFramedEditionId(edition.id);
    };

    // Camera constraints depend on the achieved viewport, not on remote
    // terrain tiles. Waiting for global `idle` made a finished range change
    // look frozen whenever a tile request remained pending.
    void map.once('moveend', settle);
    frameLockTimer.current = window.setTimeout(settle, FRAME_SETTLE_FALLBACK_MS);
    map.fitBounds(edition.frameBounds, {
      ...LIST_FIT_OPTIONS,
      bearing: edition.initialView.bearing,
      pitch: edition.initialView.pitch,
      duration: reduceMotion ? 0 : 600,
    });
  }, [
    edition.frameBounds,
    edition.id,
    edition.initialView.bearing,
    edition.initialView.pitch,
  ]);

  const capturePosterMap = useCallback<CapturePosterMap>((request) => {
    const map = mapRef.current?.getMap();

    if (!map) {
      return Promise.reject(new Error('the map is not available'));
    }

    if (captureActiveRef.current) {
      return Promise.reject(new Error('another poster capture is still running'));
    }

    const center = map.getCenter();
    const maxBounds = map.getMaxBounds();

    return new Promise<MapSnapshot>((resolve, reject) => {
      captureActiveRef.current = true;
      setCaptureState({
        phase: 'capture',
        task: {
          request,
          original: {
            center: [center.lng, center.lat],
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
            minZoom: map.getMinZoom(),
            maxBounds: maxBounds
              ? [
                  [maxBounds.getWest(), maxBounds.getSouth()],
                  [maxBounds.getEast(), maxBounds.getNorth()],
                ]
              : null,
          },
          resolve,
          reject,
        },
      });
    });
  }, []);

  useEffect(() => {
    if (captureState?.phase !== 'capture') return;

    const map = mapRef.current?.getMap();
    if (!map) {
      setCaptureState({
        phase: 'restore',
        task: captureState.task,
        result: { error: new Error('the map is no longer available') },
      });
      return;
    }

    const { task } = captureState;
    let restoreCamera: (() => void) | undefined;

    void (async () => {
      try {
        const engine = await import('../export');
        await withAbort(engine.waitForMapIdle(map), task.request.signal);
        map.setMaxBounds(null);

        restoreCamera = await engine.frameBoundary(
          map,
          task.request.bounds,
          48,
          task.request.aspect,
        );

        if (task.request.signal?.aborted) {
          throw new DOMException('Poster capture cancelled', 'AbortError');
        }

        const snapshot = await engine.captureMap(map);
        restoreCamera();
        restoreCamera = undefined;
        setCaptureState({ phase: 'restore', task, result: { snapshot } });
      } catch (error) {
        restoreCamera?.();
        setCaptureState({ phase: 'restore', task, result: { error } });
      }
    })();
  }, [captureState]);

  useEffect(() => {
    if (captureState?.phase !== 'restore') return;

    const map = mapRef.current?.getMap();
    const { task, result } = captureState;

    void (async () => {
      try {
        if (!map) throw new Error('the map is no longer available');

        map.setMinZoom(Math.min(MAP_MIN_ZOOM, task.original.minZoom));
        map.setMaxBounds(null);
        map.jumpTo({
          center: task.original.center,
          zoom: task.original.zoom,
          bearing: task.original.bearing,
          pitch: task.original.pitch,
        });
        map.setMinZoom(task.original.minZoom);
        map.setMaxBounds(task.original.maxBounds);

        const engine = await import('../export');
        await engine.waitForMapIdle(map);

        if ('error' in result) {
          task.reject(result.error);
        } else if (task.request.signal?.aborted) {
          result.snapshot.bitmap?.close();
          task.reject(new DOMException('Poster capture cancelled', 'AbortError'));
        } else {
          task.resolve(result.snapshot);
        }
      } catch (error) {
        if ('snapshot' in result) result.snapshot.bitmap?.close();
        task.reject(error);
      } finally {
        captureActiveRef.current = false;
        setCaptureState(undefined);
      }
    })();
  }, [captureState]);

  useEffect(() => {
    if (!mapReady) return;
    if (resizeTimer.current) {
      window.clearTimeout(resizeTimer.current);
      resizeTimer.current = undefined;
    }
    frameEdition();
  }, [captureActive, edition.id, frameEdition, mapReady]);

  useEffect(
    () => () => {
      if (resizeTimer.current) window.clearTimeout(resizeTimer.current);
      if (frameLockTimer.current) window.clearTimeout(frameLockTimer.current);
    },
    [],
  );

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
          ...edition.initialView,
          bounds: edition.frameBounds,
          fitBoundsOptions: LIST_FIT_OPTIONS,
        }}
        interactiveLayerIds={['peak-hitbox']}
        mapStyle={mapStyle}
        maxPitch={68}
        maxZoom={MAP_MAX_ZOOM}
        renderWorldCopies={false}
        onClick={handlePeakClick}
        onError={() => {
          if (!mapReady) setMapFailed(true);
        }}
        onLoad={() => {
          setMapReady(true);
          setMapFailed(false);
        }}
        onResize={() => {
          if (!mapReady) return;
          if (resizeTimer.current) window.clearTimeout(resizeTimer.current);
          resizeTimer.current = window.setTimeout(frameEdition, 180);
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
            <Layer
              {...terrainHillshadeLayer(activePalette)}
              beforeId={HILLSHADE_ANCHOR_ID}
            />
          </Source>
        ) : null}
        {edition.id === 'wainwrights' ? (
          <Source id="lake-district-boundary" type="geojson" data={boundaryData}>
            <Layer
              {...boundaryFillLayer(activePalette)}
              beforeId={HILL_LIGHTING_ANCHOR_ID}
            />
            <Layer
              {...boundaryLineLayer(activePalette)}
              beforeId={HILL_LIGHTING_ANCHOR_ID}
            />
          </Source>
        ) : null}
        {terrainEnabled ? (
          <Source
            id="terrain-contours"
            type="vector"
            tiles={[contourTileUrl]}
            maxzoom={16}
          >
            <Layer
              {...terrainContourLayer(activePalette)}
              beforeId={CONTOURS_ANCHOR_ID}
            />
            <Layer
              {...terrainContourLabelLayer(activePalette)}
              beforeId={CONTOURS_ANCHOR_ID}
            />
          </Source>
        ) : null}
        <Source id="list-peaks" type="geojson" data={peakGeoJson}>
          <Layer {...peakHitboxLayer(baggedOnly)} />
          <Layer {...surveyPeakMarkerLayer(activePalette, baggedOnly)} />
          <Layer {...selectedPeakMarkerLayer(activePalette, captureActive)} />
          <Layer {...selectedPeakLabelLayer(activePalette, captureActive)} />
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
      <p className="sr-only" data-map-frame-status role="status" aria-live="polite">
        {framedEditionId === edition.id
          ? `Map framed for ${edition.name}.`
          : `Framing map for ${edition.name}.`}
      </p>
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
        Export poster
      </button>
      <ExportDialog
        open={exportOpen}
        capturePosterMap={capturePosterMap}
        list={edition}
        stats={{ bagged: stats.bagged, total: stats.total }}
        activePalette={visualPreset}
        baggedPeakKey={baggedPeakKey}
        onClose={() => {
          setExportOpen(false);
        }}
      />
    </>
  );
}
