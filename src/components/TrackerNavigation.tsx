import type { ProgressStats } from '../domain';

export type TrackerRoute = 'explore' | 'logbook' | 'settings';

interface TrackerNavigationProps {
  current: TrackerRoute;
  stats: ProgressStats;
}

const routes: { href: string; id: TrackerRoute; label: string }[] = [
  { href: '#/explore', id: 'explore', label: 'Explore' },
  { href: '#/logbook', id: 'logbook', label: 'Logbook' },
  { href: '#/settings', id: 'settings', label: 'Settings' },
];

export function TrackerNavigation({ current, stats }: TrackerNavigationProps) {
  return (
    <>
      <header className="border-hairline bg-bone relative z-30 flex h-14 items-center justify-between border-b px-4 md:px-7">
        <a
          className="focus-ring flex min-h-11 items-center gap-3"
          href="#/explore"
          aria-label="Munro — open Explore"
        >
          <span
            className="border-ink font-label grid h-7 w-7 place-items-center border text-[0.65rem] font-semibold tracking-[-0.08em]"
            aria-hidden="true"
          >
            M
          </span>
          <span className="text-[0.95rem] font-semibold tracking-[-0.035em]">
            Munro
          </span>
        </a>

        <nav className="hidden h-full items-stretch md:flex" aria-label="Primary">
          {routes.map((route) => (
            <a
              key={route.id}
              aria-current={current === route.id ? 'page' : undefined}
              className={`focus-ring relative flex min-w-24 items-center justify-center px-4 text-sm font-medium transition-colors duration-200 ${current === route.id ? 'text-ink' : 'text-stone hover:text-ink'}`}
              href={route.href}
            >
              {route.label}
              {current === route.id ? (
                <span className="bg-ink absolute inset-x-4 bottom-0 h-px" />
              ) : null}
            </a>
          ))}
        </nav>

        <a
          className="focus-ring font-label text-stone hover:text-ink flex min-h-11 items-center gap-2 text-[0.68rem] transition-colors"
          href="#/logbook"
          aria-label={`${String(stats.bagged)} of ${String(stats.total)} hills bagged`}
        >
          <span className="text-ink text-sm font-semibold tabular-nums">
            {stats.bagged}
          </span>
          <span aria-hidden="true">/</span>
          <span className="tabular-nums">{stats.total}</span>
        </a>
      </header>

      <nav
        className="border-hairline bg-bone fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-3 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary"
      >
        {routes.map((route) => (
          <a
            key={route.id}
            aria-current={current === route.id ? 'page' : undefined}
            className={`focus-ring font-label relative flex min-h-11 items-center justify-center text-[0.68rem] font-medium tracking-[0.02em] ${current === route.id ? 'text-ink' : 'text-stone'}`}
            href={route.href}
          >
            {current === route.id ? (
              <span className="bg-ink absolute inset-x-5 top-0 h-px" />
            ) : null}
            {route.label}
          </a>
        ))}
      </nav>
    </>
  );
}
