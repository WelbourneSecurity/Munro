import { useEffect, useMemo, useRef, useState } from 'react';

import {
  RANGE_EDITIONS,
  buildRangeEdition,
  type Peak,
  type RangeEditionId,
  type RangeEditionView,
} from '../domain';

interface RangeSwitcherProps {
  active: RangeEditionView;
  allPeaks: Peak[];
  onChange: (editionId: RangeEditionId) => void;
}

export function RangeSwitcher({ active, allPeaks, onChange }: RangeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const counts = useMemo(
    () =>
      new Map(
        RANGE_EDITIONS.map((edition) => [
          edition.id,
          buildRangeEdition(edition.id, allPeaks).peaks.length,
        ]),
      ),
    [allPeaks],
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  return (
    <>
      <button
        className="range-trigger focus-ring border-ink bg-bone text-ink hover:bg-paper flex min-h-12 items-center gap-3 border px-4 text-left"
        type="button"
        aria-haspopup="dialog"
        aria-label={`Change range, ${active.name}`}
        onClick={() => {
          setOpen(true);
        }}
      >
        <span className="font-label text-stone text-[0.58rem]">RANGE</span>
        <span className="text-sm font-semibold">{active.name}</span>
        <span
          className="font-label text-stone ml-auto text-[0.7rem]"
          aria-hidden="true"
        >
          +
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/45 p-3 md:p-6" role="presentation">
          <section
            ref={dialogRef}
            className="bg-bone text-ink border-ink mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col border md:max-h-[calc(100dvh-3rem)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="range-index-title"
            tabIndex={-1}
          >
            <header className="border-hairline flex items-start justify-between gap-6 border-b px-5 py-5 md:px-8 md:py-7">
              <div>
                <p className="font-label text-stone text-[0.62rem]">UK EDITIONS</p>
                <h2
                  id="range-index-title"
                  className="mt-2 text-3xl font-semibold tracking-[-0.055em] md:text-5xl"
                >
                  Choose a range.
                </h2>
                <p className="text-graphite mt-3 max-w-xl text-sm leading-6">
                  Each edition has its own complete hill set, identity and map frame.
                </p>
              </div>
              <button
                className="focus-ring text-stone hover:text-ink -mr-2 grid min-h-11 min-w-11 place-items-center text-xl"
                type="button"
                aria-label="Close range index"
                onClick={() => {
                  setOpen(false);
                }}
              >
                ×
              </button>
            </header>
            <div className="min-h-0 overflow-y-auto p-3 md:p-6">
              <ul className="border-hairline grid border-t border-l sm:grid-cols-2 lg:grid-cols-3">
                {RANGE_EDITIONS.map((edition, index) => {
                  const selected = active.id === edition.id;
                  return (
                    <li
                      key={edition.id}
                      className="border-hairline bg-bone border-r border-b"
                    >
                      <button
                        className={`focus-ring flex min-h-40 w-full flex-col justify-between p-5 text-left md:min-h-48 ${selected ? 'bg-ink text-bone' : 'bg-bone text-ink hover:bg-paper'}`}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          onChange(edition.id);
                          setOpen(false);
                        }}
                      >
                        <span className="font-label text-[0.62rem] opacity-70">
                          {String(index + 1).padStart(2, '0')} /{' '}
                          {String(counts.get(edition.id) ?? 0)} {edition.peakNoun}
                        </span>
                        <span>
                          <span className="block text-2xl font-semibold tracking-[-0.045em]">
                            {edition.name}
                          </span>
                          <span className="mt-2 block text-sm leading-5 opacity-70">
                            {edition.descriptor}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
