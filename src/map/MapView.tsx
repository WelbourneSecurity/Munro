import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AttributionControl,
  Layer,
  Map,
  NavigationControl,
  Source,
} from '@vis.gl/react-maplibre';
import type { MapLayerMouseEvent, MapRef } from '@vis.gl/react-maplibre';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { ExportDialog, PeakListPanel, ProgressStats } from '../components';
import boundaryRaw from '../data/boundaries/lake-district.geojson?raw';
import hillAreasRaw from '../data/boundaries/wainwright-areas.geojson?raw';
import wainwrights from '../data/wainwrights.json';
import { mapAttributionHtml } from '../data/attribution';
import { calculateProgress, peaksToGeoJSON, type Peak } from '../domain';
import { usePreferencesStore, useProgressStore } from '../store';
import {
  LAKE_DISTRICT_BOUNDS,
  LAKE_DISTRICT_INITIAL_VIEW,
  OPENFREEMAP_VECTOR_SOURCE_URL,
} from './config';
import {
  boundaryFillLayer,
  boundaryLineLayer,
  hillAreaFillLayer,
  hillAreaLineLayer,
  terrainContourLabelLayer,
  terrainContourLayer,
  terrainHillshadeLayer,
  peakHitboxLayer,
  peakLabelLayer,
  peakMarkerLayer,
} from './layers';
import munroDarkStyle from './style/munro-dark.json';
import { contourTileUrl, setupTerrainProtocols, terrainDemSource } from './terrain';

type BoundaryData = FeatureCollection<Polygon> & {
  metadata?: Record<string, unknown>;
};

type HillAreaData = FeatureCollection<Polygon | MultiPolygon> & {
  metadata?: Record<string, unknown>;
};

const peaks = wainwrights.peaks as Peak[];
const boundaryData = JSON.parse(boundaryRaw) as BoundaryData;
const hillAreaData = JSON.parse(hillAreasRaw) as HillAreaData;

setupTerrainProtocols();

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const progressByPeakId = useProgressStore((state) => state.progressByPeakId);
  const bag = useProgressStore((state) => state.bag);
  const unbag = useProgressStore((state) => state.unbag);
  const setBaggedDate = useProgressStore((state) => state.setBaggedDate);
  const setNotes = useProgressStore((state) => state.setNotes);
  const terrainEnabled = usePreferencesStore((state) => state.terrainEnabled);
  const setTerrainEnabled = usePreferencesStore((state) => state.setTerrainEnabled);
  const [selectedPeakId, setSelectedPeakId] = useState(peaks[0]?.id);
  const [exportOpen, setExportOpen] = useState(false);
  // On small screens the panel is a bottom sheet; this collapses it so the
  // map is reachable one-handed. Desktop (lg) always shows the panel.
  const [panelOpen, setPanelOpen] = useState(true);
  const getMap = useCallback(() => mapRef.current?.getMap() ?? null, []);

  const progress = useMemo(() => Object.values(progressByPeakId), [progressByPeakId]);
  const peakGeoJson = useMemo(() => peaksToGeoJSON(peaks, progress), [progress]);
  const hillAreaGeoJson = useMemo(
    () => ({
      ...hillAreaData,
      features: hillAreaData.features.map((feature) => {
        const peakId = feature.properties?.id as string | undefined;

        return {
          ...feature,
          properties: {
            ...feature.properties,
            bagged: peakId ? progressByPeakId[peakId]?.bagged === true : false,
            selected: peakId === selectedPeakId,
          },
        };
      }),
    }),
    [progressByPeakId, selectedPeakId],
  );
  const stats = useMemo(() => calculateProgress(peaks, progress), [progress]);
  const selectedPeak = peaks.find((peak) => peak.id === selectedPeakId) ?? peaks[0];
  const selectedProgress = selectedPeak ? progressByPeakId[selectedPeak.id] : undefined;
  const isSelectedBagged = selectedProgress?.bagged === true;

  // The notes textarea only commits on blur, which never fires when the page
  // is reloaded, closed or a backgrounded PWA is killed — flush pending text
  // to the store before the page goes away so notes persist across reloads.
  // hashchange covers focus-preserving navigations (browser Back/Forward,
  // mobile back gesture): they unmount MapView without blurring the focused
  // textarea, and the listener runs while the textarea is still attached
  // because the router's re-render is batched until after the event.
  useEffect(() => {
    const peakId = selectedPeak?.id;

    if (!peakId) {
      return;
    }

    function flushNotes() {
      const textarea = notesRef.current;

      if (textarea && peakId) {
        setNotes(peakId, textarea.value || undefined);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        flushNotes();
      }
    }

    window.addEventListener('pagehide', flushNotes);
    window.addEventListener('hashchange', flushNotes);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushNotes);
      window.removeEventListener('hashchange', flushNotes);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedPeak?.id, setNotes]);

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

  function handlePeakClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    const peakId = feature?.properties.id as string | undefined;

    if (peakId) {
      selectPeak(peakId, { focusMap: false });
    }
  }

  function selectPeak(peakId: string, options: { focusMap: boolean }) {
    setSelectedPeakId(peakId);

    if (!options.focusMap) {
      return;
    }

    const peak = peaks.find((candidate) => candidate.id === peakId);

    if (!peak) {
      return;
    }

    const currentZoom = mapRef.current?.getZoom() ?? 10.5;
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    mapRef.current?.flyTo({
      center: [peak.lon, peak.lat],
      zoom: Math.max(currentZoom, 11),
      duration: reduceMotion ? 0 : 520,
    });
  }

  function toggleSelectedPeak() {
    if (!selectedPeak) {
      return;
    }

    if (isSelectedBagged) {
      unbag(selectedPeak.id);
      return;
    }

    bag(selectedPeak.id, new Intl.DateTimeFormat('en-CA').format(new Date()));
  }

  return (
    <section className="bg-surface text-primary flex h-[calc(100svh-3.5rem)] min-h-[38rem]">
      <div className="relative min-h-0 flex-1">
        <Map
          ref={mapRef}
          attributionControl={false}
          canvasContextAttributes={{ preserveDrawingBuffer: true }}
          initialViewState={{
            ...LAKE_DISTRICT_INITIAL_VIEW,
            bounds: LAKE_DISTRICT_BOUNDS,
            fitBoundsOptions: { padding: 56, maxZoom: 9.4 },
          }}
          interactiveLayerIds={['hill-area-fill', 'hill-area-line', 'peak-hitbox']}
          mapStyle={mapStyle}
          maxBounds={LAKE_DISTRICT_BOUNDS}
          maxPitch={68}
          maxZoom={16}
          minZoom={7}
          onClick={handlePeakClick}
          style={{ width: '100%', height: '100%' }}
          {...(terrainEnabled
            ? {
                terrain: {
                  source: 'terrain-dem',
                  exaggeration: 1.28,
                },
              }
            : {})}
        >
          <AttributionControl compact customAttribution={mapAttributionHtml()} />
          <NavigationControl position="top-right" showCompass />
          {terrainEnabled ? (
            <>
              <Source
                id="terrain-dem"
                type="raster-dem"
                tiles={[terrainDemSource.sharedDemProtocolUrl]}
                encoding="terrarium"
                maxzoom={13}
                tileSize={256}
              />
              <Source
                id="terrain-hillshade-dem"
                type="raster-dem"
                tiles={[terrainDemSource.sharedDemProtocolUrl]}
                encoding="terrarium"
                maxzoom={13}
                tileSize={256}
              >
                <Layer {...terrainHillshadeLayer} />
              </Source>
            </>
          ) : null}
          <Source id="lake-district-boundary" type="geojson" data={boundaryData}>
            <Layer {...boundaryFillLayer} />
            <Layer {...boundaryLineLayer} />
          </Source>
          <Source id="wainwright-areas" type="geojson" data={hillAreaGeoJson}>
            <Layer {...hillAreaFillLayer} />
            <Layer {...hillAreaLineLayer} />
          </Source>
          {terrainEnabled ? (
            <Source
              id="terrain-contours"
              type="vector"
              tiles={[contourTileUrl]}
              maxzoom={16}
            >
              <Layer {...terrainContourLayer} />
              <Layer {...terrainContourLabelLayer} />
            </Source>
          ) : null}
          <Source id="wainwright-peaks" type="geojson" data={peakGeoJson}>
            <Layer {...peakHitboxLayer} />
            <Layer {...peakMarkerLayer} />
            <Layer {...peakLabelLayer} />
          </Source>
        </Map>
      </div>

      <aside
        aria-label="Tracker panel"
        className="border-line bg-panel flex w-[24rem] flex-col border-l px-5 py-5 max-lg:absolute max-lg:inset-x-3 max-lg:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-lg:z-10 max-lg:max-h-[82svh] max-lg:w-auto max-lg:overflow-y-auto max-lg:border"
      >
        <button
          aria-controls="tracker-panel-content"
          aria-expanded={panelOpen}
          className={`border-line bg-panel text-secondary hover:text-primary focus-visible:outline-bagged min-h-11 w-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden ${
            panelOpen ? 'mb-5' : ''
          }`}
          type="button"
          onClick={() => {
            setPanelOpen((open) => !open);
          }}
        >
          {panelOpen ? 'Hide panel' : 'Show panel'}
        </button>
        <div
          id="tracker-panel-content"
          className={`flex min-h-0 flex-1 flex-col ${panelOpen ? '' : 'max-lg:hidden'}`}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-label text-label text-muted">Lake District</p>
              <h1 className="text-primary mt-1 text-2xl font-semibold">Wainwrights</h1>
            </div>
            <p className="font-label text-label text-muted text-right">214 fells</p>
          </div>

          <label className="border-line text-secondary mb-5 flex min-h-11 items-center justify-between gap-4 border px-3 py-2 text-sm">
            <span>Terrain</span>
            <input
              checked={terrainEnabled}
              className="accent-bagged focus-visible:outline-bagged h-5 w-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              type="checkbox"
              onChange={(event) => {
                setTerrainEnabled(event.currentTarget.checked);
              }}
            />
          </label>

          <div className="mb-5">
            <ProgressStats stats={stats} />
          </div>

          <button
            className="border-line bg-panel text-secondary hover:border-bagged hover:text-bagged focus-visible:outline-bagged mb-5 min-h-11 w-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            type="button"
            onClick={() => {
              setExportOpen(true);
            }}
          >
            Export image
          </button>

          {selectedPeak ? (
            <div className="border-line bg-surface mb-5 border p-4">
              <p className="font-label text-label text-muted">Selected peak</p>
              <h2 className="text-primary mt-2 text-xl font-semibold">
                {selectedPeak.name}
              </h2>
              <dl className="text-secondary mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="font-label text-label text-muted">Height</dt>
                  <dd>
                    {Math.round(selectedPeak.heightM)}m
                    {selectedPeak.heightFt
                      ? ` / ${String(selectedPeak.heightFt)}ft`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt className="font-label text-label text-muted">Grid</dt>
                  <dd>{selectedPeak.gridRef}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-label text-label text-muted">Area</dt>
                  <dd>{selectedPeak.region}</dd>
                </div>
              </dl>
              {isSelectedBagged ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <label
                      className="font-label text-label text-muted block"
                      htmlFor="peak-bagged-date"
                    >
                      Date bagged
                    </label>
                    <input
                      id="peak-bagged-date"
                      className="border-line bg-panel text-secondary focus-visible:outline-bagged mt-2 min-h-11 w-full border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      type="date"
                      value={selectedProgress.baggedDate ?? ''}
                      onChange={(event) => {
                        setBaggedDate(
                          selectedPeak.id,
                          event.currentTarget.value || undefined,
                        );
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="font-label text-label text-muted block"
                      htmlFor="peak-notes"
                    >
                      Notes
                    </label>
                    <textarea
                      key={selectedPeak.id}
                      ref={notesRef}
                      id="peak-notes"
                      className="border-line bg-panel text-secondary placeholder:text-muted focus-visible:outline-bagged mt-2 min-h-11 w-full border px-3 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      defaultValue={selectedProgress.notes ?? ''}
                      placeholder="Optional"
                      rows={2}
                      onBlur={(event) => {
                        setNotes(
                          selectedPeak.id,
                          event.currentTarget.value || undefined,
                        );
                      }}
                    />
                  </div>
                </div>
              ) : null}
              <button
                className="border-line bg-panel text-primary hover:border-bagged hover:text-bagged focus-visible:outline-bagged mt-5 min-h-11 w-full border px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                type="button"
                onClick={toggleSelectedPeak}
              >
                {isSelectedBagged ? 'Mark unbagged' : 'Mark bagged'}
              </button>
            </div>
          ) : null}

          <PeakListPanel
            peaks={peaks}
            progress={progress}
            selectedPeakId={selectedPeak?.id}
            onSelectPeak={(peakId) => {
              selectPeak(peakId, { focusMap: true });
            }}
          />
        </div>
      </aside>

      <ExportDialog
        open={exportOpen}
        getMap={getMap}
        stats={{ bagged: stats.bagged, total: stats.total }}
        onClose={() => {
          setExportOpen(false);
        }}
      />
    </section>
  );
}
