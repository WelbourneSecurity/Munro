import { PeakAtlas, PeakInspector, ProgressStats, RangeSwitcher } from '../components';
import type {
  Peak,
  PeakProgress,
  ProgressStats as Stats,
  RangeEditionId,
  RangeEditionView,
} from '../domain';

interface LogbookPageProps {
  edition: RangeEditionView;
  allPeaks: Peak[];
  peaks: Peak[];
  progress: PeakProgress[];
  stats: Stats;
  loadFailed: boolean;
  retryLoad: () => void;
  selectedPeak: Peak | undefined;
  selectedProgress: PeakProgress | undefined;
  onSelectPeak: (peakId: string) => void;
  onClosePeak: () => void;
  onBag: (peak: Peak) => void;
  onUnbag: (peak: Peak) => void;
  onEditionChange: (editionId: RangeEditionId) => void;
}

export function LogbookPage({
  edition,
  allPeaks,
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
  onEditionChange,
}: LogbookPageProps) {
  return (
    <section className="bg-bone min-h-[calc(100dvh-3.5rem)] pb-16 md:pb-0">
      <header className="border-hairline border-b px-4 pt-10 pb-9 md:px-7 md:pt-16 md:pb-14">
        <div className="mx-auto grid max-w-[92rem] gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <div>
            <p className="font-label text-stone text-[0.65rem]">
              {edition.descriptor} · {peaks.length || '—'} {edition.peakNoun}
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl leading-[0.98] font-semibold tracking-[-0.065em] text-balance md:text-6xl">
              Your {edition.name} logbook.
            </h1>
            <p className="text-graphite mt-5 max-w-xl text-sm leading-6">
              A clear record of the hills you have walked and those still waiting.
            </p>
            <div className="mt-6 max-w-md">
              <RangeSwitcher
                active={edition}
                allPeaks={allPeaks}
                onChange={onEditionChange}
              />
            </div>
          </div>
          <ProgressStats stats={stats} label={`${edition.name} bagged`} />
        </div>
      </header>
      {loadFailed ? (
        <div className="mx-auto max-w-[92rem] px-4 py-16 text-center">
          <p>Hill data could not load.</p>
          <button
            className="focus-ring mt-4 min-h-11 underline"
            type="button"
            onClick={retryLoad}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className={selectedPeak ? 'xl:pr-[23rem]' : ''}>
          <PeakAtlas
            peaks={peaks}
            progress={progress}
            selectedPeakId={selectedPeak?.id}
            {...(edition.id === 'wainwrights'
              ? { regionPrefixToHide: 'Lake District - ' }
              : {})}
            onSelectPeak={onSelectPeak}
          />
        </div>
      )}
      {selectedPeak ? (
        <div className="logbook-inspector">
          <PeakInspector
            peak={selectedPeak}
            progress={selectedProgress}
            onBag={onBag}
            onUnbag={onUnbag}
            onClose={onClosePeak}
          />
        </div>
      ) : null}
    </section>
  );
}
