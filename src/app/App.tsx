import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ProgressStats, SummitDetectionNotice, useActiveHillList } from '../components';
import { calculateProgress } from '../domain';
import { useSummitDetection, type SummitDetectionStatus } from '../hooks';
import { MapView } from '../map';
import { useProgressStore, useStorageHealthStore } from '../store';
import { DataPage } from './DataPage';
import { SettingsPage } from './SettingsPage';

type RouteId = 'home' | 'tracker' | 'data' | 'settings';

const routes: { href: string; id: RouteId; label: string }[] = [
  { href: '#/', id: 'home', label: 'Home' },
  { href: '#/tracker', id: 'tracker', label: 'Tracker' },
  { href: '#/data', id: 'data', label: 'Data' },
  { href: '#/settings', id: 'settings', label: 'Settings' },
];

function resolveRoute(hash: string): RouteId {
  switch (hash) {
    case '#/':
      return 'home';
    case '#/data':
      return 'data';
    case '#/settings':
      return 'settings';
    case '':
    case '#/tracker':
    default:
      return 'tracker';
  }
}

function useHashRoute() {
  const [route, setRoute] = useState<RouteId>(() => resolveRoute(window.location.hash));

  useEffect(() => {
    function handleHashChange() {
      setRoute(resolveRoute(window.location.hash));
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // A route change swaps the rendered page in place, so without a reset the
  // new page inherits the old page's scroll offset. Skip the initial render
  // (leaving reload scroll restoration alone); same-route hash changes never
  // re-run this effect, so same-hash clicks stay inert.
  const previousRouteRef = useRef(route);

  useEffect(() => {
    if (previousRouteRef.current === route) {
      return;
    }

    previousRouteRef.current = route;
    window.scrollTo(0, 0);
  }, [route]);

  return route;
}

export function App() {
  const route = useHashRoute();
  // Summit detection follows the active hill list, so switching lists also
  // switches which summits can be detected.
  const { peaks } = useActiveHillList();
  const summitDetection = useSummitDetection(peaks);
  const progressWriteFailed = useStorageHealthStore(
    (state) => state.progressWriteFailed,
  );

  return (
    <div className="bg-surface text-primary min-h-svh">
      <header className="border-line bg-panel flex min-h-14 items-center justify-between gap-4 border-b px-4 pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <a
          className="font-label text-primary focus-visible:outline-bagged -ml-1 inline-flex min-h-11 min-w-11 items-center px-1 text-sm font-semibold tracking-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          href="#/tracker"
        >
          Munro
        </a>
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Primary">
          {routes.map((item) => (
            <a
              key={item.id}
              aria-current={route === item.id ? 'page' : undefined}
              className={`font-label text-label inline-flex min-h-11 items-center px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                route === item.id
                  ? 'text-bagged'
                  : 'text-muted hover:text-primary focus-visible:outline-bagged'
              }`}
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      {progressWriteFailed ? (
        <p
          className="border-line bg-panel text-secondary border-b px-4 py-3 text-sm leading-6"
          role="alert"
        >
          Your progress could not be saved to this browser. It is at risk of being lost
          — export a backup from Settings.
        </p>
      ) : null}
      <main>{renderRoute(route, summitDetection.status)}</main>
      <SummitDetectionNotice
        peaks={summitDetection.detectedPeaks}
        onDismiss={summitDetection.dismissDetections}
      />
    </div>
  );
}

function renderRoute(
  route: RouteId,
  summitDetectionStatus: SummitDetectionStatus,
): ReactNode {
  if (route === 'tracker') {
    return <MapView />;
  }

  if (route === 'data') {
    return <DataPage />;
  }

  if (route === 'settings') {
    return <SettingsPage summitDetectionStatus={summitDetectionStatus} />;
  }

  return <HomePage />;
}

function HomePage() {
  const { peaks, loadFailed, retryLoad } = useActiveHillList();
  const progressByPeakId = useProgressStore((state) => state.progressByPeakId);
  const progress = Object.values(progressByPeakId);
  const stats = calculateProgress(peaks, progress);

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <p className="font-label text-label text-muted">Munro</p>
      <h1 className="text-primary mt-2 text-3xl font-semibold">
        A clean, map-first hiking tracker for UK peak bagging.
      </h1>
      <p className="text-secondary mt-5 max-w-2xl text-base leading-7">
        View the UK&apos;s classic hill lists — the Wainwrights, Munros, Corbetts and
        more — on a dark topographic map, mark peaks as bagged, and keep your progress
        local to this browser. Track them all together or focus on a single list.
      </p>

      <div className="border-line bg-panel mt-8 border p-5">
        {loadFailed ? (
          <div className="text-secondary text-sm leading-6">
            <p>Peak data could not be loaded. Check your connection and try again.</p>
            <button
              className="border-line bg-surface text-primary hover:border-bagged hover:text-bagged focus-visible:outline-bagged mt-3 min-h-11 border px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              type="button"
              onClick={retryLoad}
            >
              Retry
            </button>
          </div>
        ) : peaks.length === 0 ? (
          // Peak data is still loading; without it the stats cannot say
          // anything truthful about existing progress.
          <p className="text-secondary text-sm leading-6">Loading peak data…</p>
        ) : stats.bagged > 0 ? (
          <ProgressStats stats={stats} />
        ) : (
          <p className="text-secondary text-sm leading-6">
            Start bagging to build your local progress record.
          </p>
        )}
      </div>

      <a
        className="border-line bg-bagged text-surface focus-visible:outline-bagged mt-8 inline-flex min-h-11 items-center border px-5 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        href="#/tracker"
      >
        Open tracker
      </a>
    </section>
  );
}
