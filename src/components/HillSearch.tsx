import { useEffect, useMemo, useRef, useState } from 'react';

import { filterPeaks, groupPeakItems, type Peak, type PeakProgress } from '../domain';

interface HillSearchProps {
  open: boolean;
  listName: string;
  peaks: Peak[];
  progress: PeakProgress[];
  onOpenChange: (open: boolean) => void;
  onSelectPeak: (peakId: string) => void;
}

export function HillSearch({
  open,
  listName,
  peaks,
  progress,
  onOpenChange,
  onSelectPeak,
}: HillSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => {
    const items = filterPeaks(peaks, progress, { filter: 'all', query, sort: 'name' });
    return groupPeakItems(items.slice(0, query ? 48 : 20));
  }, [peaks, progress, query]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20" role="presentation">
      <button
        className="absolute inset-0 bg-black/30"
        type="button"
        aria-label="Close hill search"
        onClick={() => {
          onOpenChange(false);
        }}
      />
      <aside
        className="bg-bone text-ink border-ink absolute top-3 bottom-3 left-3 flex w-[min(23rem,calc(100%-1.5rem))] flex-col border md:top-5 md:bottom-5 md:left-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hill-search-title"
      >
        <div className="border-hairline flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="font-label text-stone text-[0.62rem] tracking-[0.04em]">
              {listName}
            </p>
            <h2
              id="hill-search-title"
              className="mt-1 text-xl font-semibold tracking-[-0.035em]"
            >
              Find a hill
            </h2>
          </div>
          <button
            className="focus-ring text-stone hover:text-ink -mr-2 grid min-h-11 min-w-11 place-items-center text-xl"
            type="button"
            onClick={() => {
              onOpenChange(false);
            }}
            aria-label="Close hill search"
          >
            ×
          </button>
        </div>
        <div className="border-hairline border-b p-4">
          <label className="sr-only" htmlFor="explore-hill-search">
            Search hills
          </label>
          <input
            ref={inputRef}
            id="explore-hill-search"
            className="focus-ring border-ink bg-bone placeholder:text-stone min-h-12 w-full border px-4 text-base"
            type="search"
            placeholder="Name, region or grid reference"
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
            }}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {groups.map((group) => (
            <section key={group.region} className="mb-5">
              <h3 className="font-label text-stone bg-bone sticky top-0 py-2 text-[0.62rem] tracking-[0.04em]">
                {group.region.replace('Lake District - ', '')}
              </h3>
              <ul className="border-hairline border-t">
                {group.items.map((item) => (
                  <li key={item.peak.id} className="border-hairline border-b">
                    <button
                      className="focus-ring hover:bg-paper grid min-h-14 w-full grid-cols-[1fr_auto] items-center gap-4 px-1 text-left"
                      type="button"
                      onClick={() => {
                        onSelectPeak(item.peak.id);
                        onOpenChange(false);
                      }}
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          {item.peak.name}
                        </span>
                        <span className="font-label text-stone mt-0.5 block text-[0.62rem]">
                          {Math.round(item.peak.heightM)} m
                        </span>
                      </span>
                      <span
                        className={`font-label text-[0.58rem] ${item.bagged ? 'bg-ink text-bone px-2 py-1' : 'text-stone'}`}
                      >
                        {item.bagged ? 'BAGGED' : 'OPEN'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {groups.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium">No hills match “{query}”.</p>
              <button
                className="focus-ring text-stone mt-4 min-h-11 text-sm underline underline-offset-4"
                type="button"
                onClick={() => {
                  setQuery('');
                }}
              >
                Clear search
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
