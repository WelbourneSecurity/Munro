import { useEffect, useMemo, useRef, useState } from 'react';

import {
  filterPeaks,
  formatBaggedDate,
  groupPeakItems,
  type Peak,
  type PeakFilter,
  type PeakProgress,
  type PeakSort,
} from '../domain';

interface PeakAtlasProps {
  peaks: Peak[];
  progress: PeakProgress[];
  selectedPeakId: string | undefined;
  regionPrefixToHide?: string;
  onSelectPeak: (peakId: string) => void;
}

const filters: { label: string; value: PeakFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Bagged', value: 'bagged' },
  { label: 'Open', value: 'unbagged' },
];
const RENDER_CHUNK = 240;

export function PeakAtlas({
  peaks,
  progress,
  selectedPeakId,
  regionPrefixToHide,
  onSelectPeak,
}: PeakAtlasProps) {
  const [filter, setFilter] = useState<PeakFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<PeakSort>('name');
  const [renderLimit, setRenderLimit] = useState(RENDER_CHUNK);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const allItems = useMemo(
    () => filterPeaks(peaks, progress, { filter: 'all', query: '', sort: 'name' }),
    [peaks, progress],
  );
  const items = useMemo(
    () => filterPeaks(peaks, progress, { filter, query, sort }),
    [filter, peaks, progress, query, sort],
  );
  const selectedIndex = selectedPeakId
    ? items.findIndex((item) => item.peak.id === selectedPeakId)
    : -1;
  const effectiveLimit =
    selectedIndex >= renderLimit
      ? Math.ceil((selectedIndex + 1) / RENDER_CHUNK) * RENDER_CHUNK
      : renderLimit;
  const visibleGroups = useMemo(
    () => groupPeakItems(items.slice(0, effectiveLimit)),
    [effectiveLimit, items],
  );
  const allGroups = useMemo(() => groupPeakItems(allItems), [allItems]);
  const regionStats = useMemo(
    () =>
      new Map(
        allGroups.map((group) => [
          group.region,
          {
            bagged: group.items.filter((item) => item.bagged).length,
            total: group.items.length,
          },
        ]),
      ),
    [allGroups],
  );
  const hiddenCount = Math.max(0, items.length - effectiveLimit);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || hiddenCount === 0 || typeof IntersectionObserver === 'undefined')
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting))
          setRenderLimit((value) => value + RENDER_CHUNK);
      },
      { rootMargin: '700px 0px' },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hiddenCount]);

  return (
    <section aria-labelledby="atlas-title">
      <div className="bg-bone/95 border-hairline sticky top-14 z-10 border-y px-4 py-4 backdrop-blur-sm md:px-7">
        <div className="mx-auto flex max-w-[92rem] flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p id="atlas-title" className="font-label text-stone text-[0.65rem]">
              Hill atlas
            </p>
            <p className="mt-1 text-sm font-medium">{items.length} hills shown</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="border-hairline flex border-b" aria-label="Filter hills">
              {filters.map((option) => (
                <button
                  key={option.value}
                  className={`focus-ring relative min-h-11 px-4 text-sm font-medium ${filter === option.value ? 'text-ink' : 'text-stone hover:text-ink'}`}
                  type="button"
                  aria-pressed={filter === option.value}
                  onClick={() => {
                    setFilter(option.value);
                  }}
                >
                  {option.label}
                  {filter === option.value ? (
                    <span className="bg-ink absolute inset-x-2 bottom-[-1px] h-px" />
                  ) : null}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="atlas-search">
              Search the logbook
            </label>
            <input
              id="atlas-search"
              className="focus-ring border-hairline bg-bone placeholder:text-stone min-h-11 w-full border-b px-1 text-sm sm:w-64"
              type="search"
              placeholder="Search hills or grid"
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
              }}
            />
            <label className="font-label text-stone flex min-h-11 items-center gap-3 text-[0.62rem]">
              Sort
              <select
                className="focus-ring border-hairline bg-bone text-ink min-h-11 border-b px-2 text-sm"
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
        </div>
      </div>
      <div className="mx-auto max-w-[92rem] px-4 py-8 md:px-7 md:py-12">
        {visibleGroups.map((group) => {
          const stats = regionStats.get(group.region) ?? { bagged: 0, total: 0 };
          const percentage = stats.total ? (stats.bagged / stats.total) * 100 : 0;
          return (
            <section key={group.region} className="mb-14 last:mb-0">
              <div className="mb-5 grid grid-cols-[1fr_auto] items-end gap-5">
                <div>
                  <p className="font-label text-stone text-[0.62rem]">Region</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] md:text-3xl">
                    {regionPrefixToHide
                      ? group.region.replace(regionPrefixToHide, '')
                      : group.region}
                  </h2>
                </div>
                <p className="font-label text-stone text-[0.68rem]">
                  <span className="text-ink font-semibold">{stats.bagged}</span> /{' '}
                  {stats.total}
                </p>
                <div className="bg-hairline col-span-2 h-px" aria-hidden="true">
                  <div
                    className="bg-ink h-px"
                    style={{ width: `${String(percentage)}%` }}
                  />
                </div>
              </div>
              <ul className="bg-hairline grid grid-cols-2 gap-px md:grid-cols-3 xl:grid-cols-4">
                {group.items.map((item) => {
                  const selected = selectedPeakId === item.peak.id;
                  return (
                    <li key={item.peak.id} className="bg-bone">
                      <button
                        className={`focus-ring atlas-tile relative flex min-h-24 w-full flex-col justify-between p-3 text-left ${item.bagged ? 'bg-ink text-bone hover:bg-graphite' : 'bg-bone text-ink hover:bg-paper'} ${selected ? 'atlas-tile-selected' : ''}`}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${item.peak.name}, ${String(Math.round(item.peak.heightM))} metres, ${item.bagged ? 'bagged' : 'open'}`}
                        onClick={() => {
                          onSelectPeak(item.peak.id);
                        }}
                      >
                        <span className="block pr-4 text-sm leading-snug font-semibold sm:text-base">
                          {item.peak.name}
                        </span>
                        <span className="font-label mt-4 flex w-full justify-between gap-2 text-[0.6rem]">
                          <span className={item.bagged ? 'text-paper' : 'text-stone'}>
                            {Math.round(item.peak.heightM)} m
                          </span>
                          <span className="text-right">
                            {item.progress?.baggedDate
                              ? formatBaggedDate(item.progress.baggedDate)
                              : item.bagged
                                ? 'BAGGED'
                                : 'OPEN'}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {hiddenCount > 0 ? (
          <div ref={sentinelRef} className="border-hairline border-t pt-6 text-center">
            <button
              className="focus-ring min-h-11 px-5 text-sm underline underline-offset-4"
              type="button"
              onClick={() => {
                setRenderLimit((value) => value + RENDER_CHUNK);
              }}
            >
              Show {hiddenCount} more hills
            </button>
          </div>
        ) : null}
        {items.length === 0 ? (
          <div className="border-hairline border-y py-16 text-center">
            <p className="text-lg font-semibold">No hills in this view.</p>
            <button
              className="focus-ring bg-ink text-bone mt-6 min-h-11 px-5 text-sm"
              type="button"
              onClick={() => {
                setFilter('all');
                setQuery('');
                setSort('name');
              }}
            >
              Show all hills
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
