import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';

import { formatBaggedDate, type Peak, type PeakProgress } from '../domain';
import { useProgressStore } from '../store';

interface PeakInspectorProps {
  peak: Peak;
  progress: PeakProgress | undefined;
  onBag: (peak: Peak) => void;
  onUnbag: (peak: Peak) => void;
  onClose: () => void;
}

export function PeakInspector({
  peak,
  progress,
  onBag,
  onUnbag,
  onClose,
}: PeakInspectorProps) {
  const bagged = progress?.bagged === true;
  const setBaggedDate = useProgressStore((state) => state.setBaggedDate);
  const setNotes = useProgressStore((state) => state.setNotes);
  const dragStart = useRef<number | undefined>(undefined);
  const [dragOffset, setDragOffset] = useState(0);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragStart.current !== undefined) {
      setDragOffset(Math.max(0, event.clientY - dragStart.current));
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragStart.current === undefined) return;
    const distance = Math.max(0, event.clientY - dragStart.current);
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStart.current = undefined;
    if (distance > 96) onClose();
    else setDragOffset(0);
  }

  return (
    <aside
      className="border-ink bg-bone text-ink peak-inspector border"
      aria-labelledby="selected-peak-name"
      data-testid="peak-inspector"
      style={{ '--sheet-offset': `${String(dragOffset)}px` } as CSSProperties}
    >
      <div
        className="touch-none py-2 md:hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-hidden="true"
      >
        <span className="bg-hairline mx-auto block h-0.5 w-10" />
      </div>
      <div className="border-hairline flex items-start justify-between gap-5 border-b px-5 py-4">
        <div>
          <p className="font-label text-stone text-[0.65rem] tracking-[0.04em]">
            {bagged ? 'Logbook entry' : 'Selected summit'}
          </p>
          <h2
            id="selected-peak-name"
            className="mt-1.5 text-xl leading-tight font-semibold tracking-[-0.035em]"
          >
            {peak.name}
          </h2>
        </div>
        <button
          className="focus-ring text-stone hover:text-ink -mr-2 grid min-h-11 min-w-11 place-items-center text-xl"
          type="button"
          onClick={onClose}
          aria-label={`Close ${peak.name} details`}
        >
          ×
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 px-5 py-4">
        <Detail label="Height" value={`${String(Math.round(peak.heightM))} m`} />
        <Detail
          label="Feet"
          value={peak.heightFt ? `${String(peak.heightFt)} ft` : '—'}
        />
        <Detail label="Grid reference" value={peak.gridRef ?? '—'} />
        <Detail label="Region" value={peak.region.replace('Lake District - ', '')} />
      </dl>

      {bagged ? (
        <div className="border-hairline mx-5 border-t py-4">
          <label
            className="font-label text-stone block text-[0.62rem]"
            htmlFor="peak-bagged-date"
          >
            Date bagged
          </label>
          <input
            id="peak-bagged-date"
            className="focus-ring border-hairline bg-bone mt-2 min-h-11 w-full border-b text-sm"
            type="date"
            value={progress.baggedDate ?? ''}
            onChange={(event) => {
              setBaggedDate(peak.id, event.currentTarget.value || undefined);
            }}
          />
          <label
            className="font-label text-stone mt-4 block text-[0.62rem]"
            htmlFor="peak-notes"
          >
            Notes
          </label>
          <textarea
            key={peak.id}
            id="peak-notes"
            className="focus-ring border-hairline bg-bone mt-2 min-h-20 w-full border p-3 text-sm"
            defaultValue={progress.notes ?? ''}
            placeholder="Optional"
            rows={2}
            onBlur={(event) => {
              setNotes(peak.id, event.currentTarget.value || undefined);
            }}
          />
          {progress.baggedDate ? (
            <p className="font-label text-stone mt-3 text-[0.62rem]">
              Recorded {formatBaggedDate(progress.baggedDate)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-hairline border-t px-5 py-4">
        {bagged ? (
          <div className="flex items-center justify-between gap-4">
            <span className="font-label bg-ink text-bone inline-flex min-h-11 items-center px-4 text-[0.68rem]">
              BAGGED
            </span>
            <button
              className="focus-ring text-stone hover:text-ink min-h-11 text-sm underline underline-offset-4"
              type="button"
              onClick={() => {
                onUnbag(peak);
              }}
            >
              Remove status
            </button>
          </div>
        ) : (
          <button
            className="focus-ring bg-ink text-bone hover:bg-graphite min-h-12 w-full px-5 text-sm font-semibold"
            type="button"
            onClick={() => {
              onBag(peak);
            }}
          >
            Bag this hill
          </button>
        )}
      </div>
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-label text-stone text-[0.62rem]">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
