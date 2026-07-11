import { useEffect, useMemo, useRef, useState } from 'react';

import {
  filterPeaks,
  groupPeakItems,
  type Peak,
  type PeakFilter,
  type PeakGroup,
  type PeakProgress,
  type PeakSort,
} from '../domain';

interface PeakListPanelProps {
  peaks: Peak[];
  progress: PeakProgress[];
  selectedPeakId: string | undefined;
  onSelectPeak: (peakId: string) => void;
}

const baggedDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatBaggedDate(isoDate: string) {
  const parsed = new Date(`${isoDate}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return baggedDateFormatter.format(parsed);
}

const filterOptions: { label: string; value: PeakFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Bagged', value: 'bagged' },
  { label: 'Open', value: 'unbagged' },
];

// The UK-wide lists run to over 1,600 peaks; rendering them all at once
// makes every search keystroke re-render thousands of DOM nodes. The panel
// renders one window of rows and grows it as the list is scrolled (or via
// the explicit button when IntersectionObserver is unavailable).
const RENDER_CHUNK = 120;

/** Truncates groups to the first `limit` rows, in rendered group order. */
function limitGroups(groups: PeakGroup[], limit: number): PeakGroup[] {
  const limited: PeakGroup[] = [];
  let remaining = limit;

  for (const group of groups) {
    if (remaining <= 0) {
      break;
    }

    limited.push(
      remaining >= group.items.length
        ? group
        : { region: group.region, items: group.items.slice(0, remaining) },
    );
    remaining -= group.items.length;
  }

  return limited;
}

/** Row index of a peak in rendered group order, or -1 when absent. */
function renderedIndexOf(groups: PeakGroup[], peakId: string | undefined): number {
  if (!peakId) {
    return -1;
  }

  let index = 0;

  for (const group of groups) {
    for (const item of group.items) {
      if (item.peak.id === peakId) {
        return index;
      }

      index += 1;
    }
  }

  return -1;
}

export function PeakListPanel({
  peaks,
  progress,
  selectedPeakId,
  onSelectPeak,
}: PeakListPanelProps) {
  const [filter, setFilter] = useState<PeakFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<PeakSort>('name');

  const items = useMemo(
    () => filterPeaks(peaks, progress, { filter, query, sort }),
    [filter, peaks, progress, query, sort],
  );
  const groups = useMemo(() => groupPeakItems(items), [items]);

  const [renderLimit, setRenderLimit] = useState(RENDER_CHUNK);
  const [prevItems, setPrevItems] = useState(items);

  // Render-time reset: whichever of search/filter/sort/list produced a new
  // item set, the window snaps back so a keystroke renders one chunk.
  if (prevItems !== items) {
    setPrevItems(items);
    setRenderLimit(RENDER_CHUNK);
  }

  // A peak selected from the map may sit past the window; keep its row
  // rendered so the panel always reflects the selection.
  const visibleCount = Math.min(
    items.length,
    Math.max(renderLimit, renderedIndexOf(groups, selectedPeakId) + 1),
  );
  const visibleGroups = useMemo(
    () => limitGroups(groups, visibleCount),
    [groups, visibleCount],
  );
  const hiddenCount = items.length - visibleCount;

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (hiddenCount <= 0 || !sentinel || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRenderLimit((limit) => limit + RENDER_CHUNK);
        }
      },
      { root: scrollRef.current, rootMargin: '600px 0px' },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
    // Re-observe after each growth: a sentinel that stayed inside the
    // margin while rows were added would otherwise never fire again.
  }, [hiddenCount]);

  return (
    <section aria-labelledby="peak-list-heading" className="min-h-0">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2
            id="peak-list-heading"
            className="font-label text-label text-muted uppercase"
          >
            Peaks
          </h2>
          <p className="text-secondary mt-1 text-sm">{items.length} shown</p>
        </div>
        <label className="font-label text-label text-muted flex items-center gap-2">
          Sort
          <select
            className="border-line bg-surface text-secondary focus-visible:outline-bagged min-h-11 border px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            value={sort}
            onChange={(event) => {
              setSort(event.currentTarget.value as PeakSort);
            }}
          >
            <option value="name">Name</option>
            <option value="height">Height</option>
          </select>
        </label>
      </div>

      <div
        aria-label="Filter peaks"
        className="border-line mb-3 grid grid-cols-3 border"
        role="group"
      >
        {filterOptions.map((option) => (
          <button
            key={option.value}
            aria-pressed={filter === option.value}
            className={`font-label text-label border-r-line min-h-11 border-r px-2 transition-colors last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${
              filter === option.value
                ? // The inset focus ring sits on the bagged fill, so it uses
                  // the dark surface token — outline-bagged would vanish.
                  'bg-bagged text-surface focus-visible:outline-surface'
                : 'bg-panel text-secondary hover:text-primary focus-visible:outline-bagged'
            }`}
            type="button"
            onClick={() => {
              setFilter(option.value);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="peak-search">
        Search peaks
      </label>
      <input
        id="peak-search"
        className="border-line bg-surface text-primary placeholder:text-muted focus-visible:outline-bagged mb-4 min-h-11 w-full border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        placeholder="Search by name, fell area or grid"
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
        }}
      />

      <div
        ref={scrollRef}
        className="max-h-[34svh] overflow-y-auto pr-1 lg:max-h-[calc(100svh-34rem)]"
      >
        {visibleGroups.map((group) => (
          <div key={group.region} className="mb-5">
            <h3 className="font-label text-label text-muted bg-panel sticky top-0 py-2">
              {group.region.replace('Lake District - ', '')}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const baggedDate = item.progress?.baggedDate
                  ? formatBaggedDate(item.progress.baggedDate)
                  : undefined;

                return (
                  <li key={item.peak.id}>
                    <button
                      className={`focus-visible:outline-bagged grid min-h-12 w-full grid-cols-[1fr_auto] items-center gap-3 border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                        selectedPeakId === item.peak.id
                          ? 'border-bagged bg-surface'
                          : 'border-line bg-panel hover:border-muted'
                      }`}
                      type="button"
                      onClick={() => {
                        onSelectPeak(item.peak.id);
                      }}
                    >
                      <span>
                        <span className="text-primary block text-sm font-semibold">
                          {item.peak.name}
                        </span>
                        <span className="text-muted text-xs">
                          {Math.round(item.peak.heightM)}m
                          {baggedDate ? ` · ${baggedDate}` : ''}
                        </span>
                      </span>
                      {/* Filled square for bagged, hollow outline for unbagged,
                          so the state is not conveyed by colour alone. */}
                      <span
                        className={`h-2.5 w-2.5 ${
                          item.bagged ? 'bg-bagged' : 'border-unbagged border'
                        }`}
                        aria-label={item.bagged ? 'Bagged' : 'Unbagged'}
                        role="img"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {hiddenCount > 0 ? (
          <div ref={sentinelRef}>
            <button
              className="border-line text-muted hover:text-primary min-h-11 w-full border px-3 text-sm transition-colors"
              type="button"
              onClick={() => {
                setRenderLimit((limit) => limit + RENDER_CHUNK);
              }}
            >
              Show {hiddenCount} more
            </button>
          </div>
        ) : null}
        {groups.length === 0 ? (
          <p className="text-muted border-line border px-3 py-5 text-sm">
            No peaks match this view.
          </p>
        ) : null}
      </div>
    </section>
  );
}
