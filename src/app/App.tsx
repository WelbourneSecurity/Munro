import { useEffect, useMemo, useRef, useState } from 'react';

import {
  SummitDetectionNotice,
  TrackerNavigation,
  UndoToast,
  useActiveHillList,
  type TrackerRoute,
} from '../components';
import {
  calculateProgress,
  buildRangeEdition,
  isRangeEditionId,
  toLocalISODate,
  type Peak,
  type PeakProgress,
  type RangeEditionId,
} from '../domain';
import { useSummitDetection } from '../hooks';
import { usePreferencesStore, useProgressStore, useStorageHealthStore } from '../store';
import { applyVisualPreset } from '../theme';
import { ExplorePage } from './ExplorePage';
import { LogbookPage } from './LogbookPage';
import { SettingsPage } from './SettingsPage';

interface UndoState {
  message: string;
  peakId: string;
  previous: PeakProgress | undefined;
}

const RANGE_STORAGE_KEY = 'munro.range.v1';

function initialRangeEdition(): RangeEditionId {
  try {
    const saved = localStorage.getItem(RANGE_STORAGE_KEY);
    return isRangeEditionId(saved) ? saved : 'uk';
  } catch {
    return 'uk';
  }
}

function resolveRoute(hash: string): TrackerRoute {
  if (hash === '#/logbook') return 'logbook';
  if (hash === '#/settings' || hash === '#/data') return 'settings';
  return 'explore';
}

function useHashRoute() {
  const [route, setRoute] = useState<TrackerRoute>(() => resolveRoute(location.hash));
  useEffect(() => {
    const onHashChange = () => {
      setRoute(resolveRoute(location.hash));
    };
    addEventListener('hashchange', onHashChange);
    return () => {
      removeEventListener('hashchange', onHashChange);
    };
  }, []);
  return route;
}

export function App() {
  const route = useHashRoute();
  const { peaks: allPeaks, loadFailed, retryLoad } = useActiveHillList('all');
  const [editionId, setEditionId] = useState<RangeEditionId>(initialRangeEdition);
  const edition = useMemo(
    () => buildRangeEdition(editionId, allPeaks),
    [allPeaks, editionId],
  );
  const peaks = edition.peaks;
  const summitDetection = useSummitDetection(peaks);
  const progressWriteFailed = useStorageHealthStore(
    (state) => state.progressWriteFailed,
  );
  const progressByPeakId = useProgressStore((state) => state.progressByPeakId);
  const visualPreset = usePreferencesStore((state) => state.visualPreset);
  const bag = useProgressStore((state) => state.bag);
  const unbag = useProgressStore((state) => state.unbag);
  const restorePeakProgress = useProgressStore((state) => state.restorePeakProgress);
  const [selectedPeakId, setSelectedPeakId] = useState<string>();
  const [undoState, setUndoState] = useState<UndoState>();
  const undoTimer = useRef<number | undefined>(undefined);
  const progress = useMemo(() => Object.values(progressByPeakId), [progressByPeakId]);
  const stats = useMemo(() => calculateProgress(peaks, progress), [peaks, progress]);
  const selectedPeak = peaks.find((peak) => peak.id === selectedPeakId);
  const selectedProgress = selectedPeak ? progressByPeakId[selectedPeak.id] : undefined;

  useEffect(() => {
    document.title =
      edition.identity === 'Munro' ? 'Munro' : `${edition.identity} · Munro`;
  }, [edition.identity]);

  useEffect(() => {
    applyVisualPreset(visualPreset);
  }, [visualPreset]);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  function queueUndo(next: UndoState) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoState(next);
    undoTimer.current = window.setTimeout(() => {
      setUndoState(undefined);
    }, 6000);
  }
  function handleBag(peak: Peak) {
    const previous = progressByPeakId[peak.id];
    bag(peak.id, toLocalISODate(new Date()));
    queueUndo({
      message: `${peak.name} added to your logbook.`,
      peakId: peak.id,
      previous,
    });
  }
  function handleUnbag(peak: Peak) {
    const previous = progressByPeakId[peak.id];
    unbag(peak.id);
    queueUndo({
      message: `${peak.name} removed from your logbook.`,
      peakId: peak.id,
      previous,
    });
  }
  function handleUndo() {
    if (!undoState) return;
    restorePeakProgress(undoState.peakId, undoState.previous);
    setUndoState(undefined);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }
  function handleEditionChange(nextEditionId: RangeEditionId) {
    setEditionId(nextEditionId);
    setSelectedPeakId(undefined);
    try {
      localStorage.setItem(RANGE_STORAGE_KEY, nextEditionId);
    } catch {
      // The edition still changes for this session when storage is unavailable.
    }
  }

  return (
    <div className="app-shell min-h-dvh">
      <a
        className="focus-ring bg-ink text-bone fixed top-2 left-2 z-50 -translate-y-20 px-4 py-3 text-sm focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <TrackerNavigation current={route} stats={stats} identity={edition.identity} />
      {progressWriteFailed ? (
        <p
          className="border-hairline bg-paper text-graphite border-b px-4 py-3 text-sm"
          role="alert"
        >
          Your progress could not be saved to this browser. Export a backup from
          Settings.
        </p>
      ) : null}
      <main id="main-content">
        {route === 'explore' ? (
          <ExplorePage
            edition={edition}
            allPeaks={allPeaks}
            peaks={peaks}
            progress={progress}
            stats={stats}
            loadFailed={loadFailed}
            retryLoad={retryLoad}
            selectedPeak={selectedPeak}
            selectedProgress={selectedProgress}
            onSelectPeak={setSelectedPeakId}
            onClosePeak={() => {
              setSelectedPeakId(undefined);
            }}
            onBag={handleBag}
            onUnbag={handleUnbag}
            onEditionChange={handleEditionChange}
          />
        ) : null}
        {route === 'logbook' ? (
          <LogbookPage
            edition={edition}
            allPeaks={allPeaks}
            peaks={peaks}
            progress={progress}
            stats={stats}
            loadFailed={loadFailed}
            retryLoad={retryLoad}
            selectedPeak={selectedPeak}
            selectedProgress={selectedProgress}
            onSelectPeak={setSelectedPeakId}
            onClosePeak={() => {
              setSelectedPeakId(undefined);
            }}
            onBag={handleBag}
            onUnbag={handleUnbag}
            onEditionChange={handleEditionChange}
          />
        ) : null}
        {route === 'settings' ? (
          <SettingsPage summitDetectionStatus={summitDetection.status} />
        ) : null}
      </main>
      <SummitDetectionNotice
        peaks={summitDetection.detectedPeaks}
        onDismiss={summitDetection.dismissDetections}
      />
      {undoState ? (
        <UndoToast
          message={undoState.message}
          onUndo={handleUndo}
          onDismiss={() => {
            setUndoState(undefined);
          }}
        />
      ) : null}
    </div>
  );
}
