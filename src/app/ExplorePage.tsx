import { useState } from 'react';

import { HillListSwitcher, HillSearch, PeakInspector } from '../components';
import type { HillListDefinition } from '../data/lists';
import type { Peak, PeakProgress, ProgressStats } from '../domain';
import { MapView } from '../map';

interface ExplorePageProps {
  list: HillListDefinition;
  peaks: Peak[];
  progress: PeakProgress[];
  stats: ProgressStats;
  loadFailed: boolean;
  retryLoad: () => void;
  selectedPeak: Peak | undefined;
  selectedProgress: PeakProgress | undefined;
  onSelectPeak: (peakId: string) => void;
  onClosePeak: () => void;
  onBag: (peak: Peak) => void;
  onUnbag: (peak: Peak) => void;
}

export function ExplorePage({
  list,
  peaks,
  progress,
  stats,
  loadFailed,
  retryLoad,
  selectedPeak,
  selectedProgress,
  onSelectPeak,
  onClosePeak,
  onBag,
  onUnbag,
}: ExplorePageProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <section
      className="explore-shell bg-map relative overflow-hidden"
      aria-label={`Explore ${list.name}`}
    >
      <MapView
        list={list}
        peaks={peaks}
        stats={stats}
        selectedPeakId={selectedPeak?.id}
        onSelectPeak={onSelectPeak}
      />
      <div className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-5.5rem)] items-stretch gap-2 md:top-5 md:left-5">
        <button
          aria-label="Find a hill"
          className="focus-ring bg-bone text-ink border-ink hover:bg-paper flex min-h-12 items-center gap-4 border px-4 text-sm font-semibold shadow-[0_12px_40px_rgb(17_17_15/0.18)]"
          type="button"
          onClick={() => {
            setSearchOpen(true);
          }}
        >
          <span className="font-label text-stone text-[0.62rem]" aria-hidden="true">
            {peaks.length || '—'}
          </span>
          Find a hill
        </button>
        <div className="list-switcher-compact bg-bone shadow-[0_12px_40px_rgb(17_17_15/0.14)]">
          <HillListSwitcher />
        </div>
      </div>
      {loadFailed ? (
        <div
          className="bg-bone text-ink border-ink absolute top-1/2 left-1/2 z-10 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 border p-5"
          role="alert"
        >
          <p className="font-semibold">Hill data could not load.</p>
          <button
            className="focus-ring mt-4 min-h-11 underline underline-offset-4"
            type="button"
            onClick={retryLoad}
          >
            Try again
          </button>
        </div>
      ) : null}
      {!selectedPeak && !loadFailed ? (
        <div className="bg-ink/88 text-bone absolute bottom-4 left-3 z-10 hidden max-w-xs px-4 py-3 backdrop-blur-sm md:block">
          <p className="font-label text-[0.62rem]">
            EXPLORE {list.regionLabel.toUpperCase()}
          </p>
          <p className="text-paper mt-1 text-sm">
            Select a survey marker or search {list.name}.
          </p>
        </div>
      ) : null}
      {selectedPeak ? (
        <PeakInspector
          peak={selectedPeak}
          progress={selectedProgress}
          onBag={onBag}
          onUnbag={onUnbag}
          onClose={onClosePeak}
        />
      ) : null}
      <HillSearch
        open={searchOpen}
        listName={list.name}
        peaks={peaks}
        progress={progress}
        onOpenChange={setSearchOpen}
        onSelectPeak={onSelectPeak}
      />
    </section>
  );
}
