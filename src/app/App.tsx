import { useEffect, useState, type ReactNode } from 'react';

import { ProgressStats } from '../components';
import wainwrights from '../data/wainwrights.json';
import { calculateProgress, type Peak } from '../domain';
import { MapView } from '../map';
import { useProgressStore } from '../store';
import { SettingsPage } from './SettingsPage';

type RouteId = 'home' | 'tracker' | 'data' | 'settings';

const routes: { href: string; id: RouteId; label: string }[] = [
  { href: '#/', id: 'home', label: 'Home' },
  { href: '#/tracker', id: 'tracker', label: 'Tracker' },
  { href: '#/data', id: 'data', label: 'Data' },
  { href: '#/settings', id: 'settings', label: 'Settings' },
];

const peaks = wainwrights.peaks as Peak[];

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

  return route;
}

export function App() {
  const route = useHashRoute();

  return (
    <div className="bg-surface text-primary min-h-svh">
      <header className="border-line bg-panel flex min-h-14 items-center justify-between gap-4 border-b px-4">
        <a
          className="font-label text-primary focus-visible:outline-bagged text-sm font-semibold tracking-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          href="#/tracker"
        >
          Munro
        </a>
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Primary">
          {routes.map((item) => (
            <a
              key={item.id}
              aria-current={route === item.id ? 'page' : undefined}
              className={`font-label text-label min-h-10 px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
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
      <main>{renderRoute(route)}</main>
    </div>
  );
}

function renderRoute(route: RouteId): ReactNode {
  if (route === 'tracker') {
    return <MapView />;
  }

  if (route === 'data') {
    return (
      <StubPage title="Data" description="Source data and backup tools land here." />
    );
  }

  if (route === 'settings') {
    return <SettingsPage />;
  }

  return <HomePage />;
}

function HomePage() {
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
        View the Wainwrights on a dark topographic map, mark peaks as bagged, and keep
        your progress local to this browser. The first version stays focused on the Lake
        District and the 214 Wainwrights.
      </p>

      <div className="border-line bg-panel mt-8 border p-5">
        {stats.bagged > 0 ? (
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

function StubPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <p className="font-label text-label text-muted">Munro</p>
      <h1 className="text-primary mt-2 text-3xl font-semibold">{title}</h1>
      <p className="text-secondary mt-4 max-w-xl text-sm leading-6">{description}</p>
    </section>
  );
}
