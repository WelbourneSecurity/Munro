import { useEffect, useMemo, useRef, useState } from 'react';
// maplibre-gl appears here with `import type` ONLY — the type is erased at
// compile time. The live map object is passed in by reference from MapView,
// which stays the only module touching maplibre-gl at runtime.
import type { HillListDefinition } from '../data/lists';
import type { RangeEditionView } from '../domain';
import { downloadBlob, exportFilename } from '../export/download';
import type { CapturePosterMap, ExportPresetId } from '../export';
import { VISUAL_PRESETS, type MapPaletteId } from '../theme';

interface ExportStats {
  bagged: number;
  total: number;
}

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  capturePosterMap: CapturePosterMap;
  /** The active hill list: frames its bounds, titles and names the image. */
  list: HillListDefinition | RangeEditionView;
  stats: ExportStats;
  activePalette: MapPaletteId;
  baggedPeakKey: string;
}

/** One settled composition, tagged with the inputs it was composed from. */
interface ComposeOutcome {
  key: string;
  result: { blob: Blob; previewUrl: string } | { error: string };
}

const PRESET_OPTIONS: { id: ExportPresetId; label: string }[] = [
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
];

// The export layout sizes its map box from how many lines the attribution
// wraps to, which is only known once compose measures the text. Two lines is
// the typical count at both presets; the frame padding above absorbs the
// small aspect drift when the real count differs by a line.
const ATTRIBUTION_LINES_ESTIMATE = 2;
// Let a quick preset/palette choice supersede the default preview before it
// mutates the shared MapLibre style and camera.
const COMPOSE_SETTLE_MS = 180;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Web Share members re-typed as optional — older browsers lack them. */
function shareApi(): Partial<Pick<Navigator, 'canShare' | 'share'>> {
  return navigator;
}

/**
 * The export dialog: preset choice, a live preview of the composed image,
 * Download PNG and — where the browser can share files — Web Share.
 *
 * The composition engine is loaded with a dynamic `import('../export')` so
 * its code stays out of the initial bundle (the T6.4 performance budget
 * relies on that split).
 */
export function ExportDialog({
  open,
  onClose,
  capturePosterMap,
  list,
  stats,
  activePalette,
  baggedPeakKey,
}: ExportDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Compose runs mutate the shared map camera (frame → capture → restore), so
  // they must never overlap: each run is chained onto the previous one and
  // only reads the camera after the previous run's restore() has put the
  // user's viewport back. The chain is kept settled so a failed run never
  // blocks later ones.
  const composeQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [presetId, setPresetId] = useState<ExportPresetId>('portrait');
  const [paletteOverride, setPaletteOverride] = useState<MapPaletteId>();
  const paletteId = paletteOverride ?? activePalette;
  const [outcome, setOutcome] = useState<ComposeOutcome | null>(null);
  const { bagged, total } = stats;
  const isEdition = 'identity' in list;
  const subjectKey = isEdition ? list.key : list.id;
  const subjectTitle = isEdition ? list.name : `${list.regionLabel} · ${list.name}`;
  const subjectLabel = isEdition ? list.descriptor : list.regionLabel;

  // The outcome only applies while its inputs match; otherwise a new
  // composition is in flight and the dialog shows the quiet busy state.
  const composeKey = `${subjectKey}:${presetId}:${paletteId}:${baggedPeakKey}:${String(total)}`;
  const current = open && outcome?.key === composeKey ? outcome.result : null;
  const readyBlob = current && 'blob' in current ? current.blob : null;

  function handleClose() {
    setOutcome(null);
    setPaletteOverride(undefined);
    onClose();
  }

  // Move focus into the dialog on open; hand it back to the trigger on close.
  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.activeElement;
    dialogRef.current?.focus();

    return () => {
      if (previous instanceof HTMLElement) {
        previous.focus();
      }
    };
  }, [open]);

  // Escape closes; Tab is trapped within the dialog while it is open.
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOutcome(null);
        setPaletteOverride(undefined);
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      const active = document.activeElement;

      // Focus can fall outside the dialog — to body after a backdrop click,
      // or when a focused control (the conditional Share button) unmounts.
      // Pull Tab back into the trap instead of letting it walk the obscured
      // background app behind aria-modal.
      if (!(active instanceof Node) || !dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey) {
        if (active === first || active === dialog) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || active === dialog) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // Compose the preview whenever the dialog opens, the list or preset
  // changes or the progress numbers change. The user's viewport is restored
  // even on failure.
  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const key = `${subjectKey}:${presetId}:${paletteId}:${baggedPeakKey}:${String(total)}`;

    const compose = async (): Promise<Blob> => {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, COMPOSE_SETTLE_MS);
      });

      // A queued run whose effect has already been cleaned up (preset
      // toggled again, dialog closed) would frame, capture and restore the
      // shared map camera for an image nobody can see — with the dialog
      // gone, the user would just watch their map jump to the export
      // framing and back. Bail before touching the map.
      if (cancelled) {
        throw new Error('superseded before composing started');
      }

      // Dynamic import keeps the composition engine in its own chunk.
      const engine = await import('../export');
      const preset = engine.getExportPreset(presetId);
      const layout = engine.layoutExport(preset, ATTRIBUTION_LINES_ESTIMATE);

      // Frame the active list's bounds at the destination map box's aspect
      // (frameBoundary widens the fit padding via coverCropPadding so the
      // later centre-crop trims only padding), capture, then always restore
      // the user's exact viewport — even when the capture fails.
      const snapshot = await capturePosterMap({
        palette: paletteId,
        bounds: isEdition ? list.frameBounds : list.bounds,
        aspect: layout.map.width / layout.map.height,
        signal: controller.signal,
      });

      return engine.composeExport(
        snapshot,
        { bagged, total },
        { preset: presetId, title: subjectTitle },
      );
    };

    // Queue behind any in-flight run so camera mutations never interleave:
    // this run's frameBoundary reads the true user viewport, not a previous
    // run's temporary export framing. A run superseded while still queued
    // bails at the top of compose() without touching the camera.
    const run = composeQueueRef.current.then(compose);
    composeQueueRef.current = run.catch(() => undefined);

    run
      .then((blob) => {
        if (!cancelled) {
          setOutcome({
            key,
            result: { blob, previewUrl: URL.createObjectURL(blob) },
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setOutcome({
            key,
            result: {
              error: error instanceof Error ? error.message : 'unknown error',
            },
          });
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    open,
    presetId,
    paletteId,
    bagged,
    total,
    baggedPeakKey,
    capturePosterMap,
    isEdition,
    list,
    subjectKey,
    subjectTitle,
  ]);

  // Release each preview's object URL once it is replaced or discarded.
  const previewUrl =
    outcome && 'previewUrl' in outcome.result ? outcome.result.previewUrl : undefined;
  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const canShareFiles = useMemo(() => {
    if (!readyBlob) {
      return false;
    }

    const api = shareApi();

    if (!api.canShare || !api.share) {
      return false;
    }

    return api.canShare({
      files: [new File([readyBlob], exportFilename(list.id), { type: 'image/png' })],
    });
  }, [readyBlob, list.id]);

  if (!open) {
    return null;
  }

  // One persistent live region announces the export lifecycle. The visual
  // states below swap whole elements, and neither a freshly inserted
  // role="status"/role="alert" node nor the Download button's disabled
  // attribute flipping is reliably announced — only a text update inside an
  // already-mounted live region is.
  const statusMessage =
    current === null
      ? 'Composing image…'
      : 'error' in current
        ? `Export failed: ${current.error}.`
        : 'Export ready.';

  function handleDownload() {
    if (readyBlob) {
      downloadBlob(readyBlob, exportFilename(list.id));
    }
  }

  async function handleShare() {
    if (!readyBlob) {
      return;
    }

    const filename = exportFilename(list.id);
    const api = shareApi();

    if (!api.share) {
      downloadBlob(readyBlob, filename);
      return;
    }

    try {
      await api.share({
        files: [new File([readyBlob], filename, { type: 'image/png' })],
      });
    } catch (error) {
      // The user closing the share sheet is not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      downloadBlob(readyBlob, filename);
    }
  }

  return (
    <div className="bg-ink/70 fixed inset-0 z-50 flex items-center justify-center pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
      <div
        ref={dialogRef}
        aria-labelledby="export-dialog-title"
        aria-modal="true"
        className="border-ink bg-bone max-h-[92svh] w-full max-w-lg overflow-y-auto border p-5 focus:outline-none md:p-7"
        role="dialog"
        tabIndex={-1}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-label text-stone text-[0.62rem]">FIELD POSTER</p>
            <h2
              id="export-dialog-title"
              className="text-ink mt-1 text-2xl font-semibold tracking-[-0.04em]"
            >
              Export image
            </h2>
          </div>
          <button
            className="focus-ring text-stone hover:text-ink min-h-11 min-w-11 px-3 text-sm"
            type="button"
            onClick={handleClose}
          >
            Close
          </button>
        </div>

        <div className="border-hairline mb-5 border-y py-3">
          <p className="font-label text-stone text-[0.6rem]">{subjectLabel}</p>
          <p className="mt-1 text-sm font-semibold">
            {bagged} / {total} bagged
          </p>
        </div>

        <p aria-atomic="true" className="sr-only" role="status">
          {statusMessage}
        </p>

        <div
          aria-label="Export preset"
          className="border-hairline grid grid-cols-2 border-b"
          role="group"
        >
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option.id}
              aria-pressed={presetId === option.id}
              className={`focus-ring font-label relative min-h-11 px-2 text-[0.65rem] ${
                presetId === option.id
                  ? 'text-ink after:bg-ink after:absolute after:inset-x-4 after:bottom-[-1px] after:h-px'
                  : 'text-stone hover:text-ink'
              }`}
              type="button"
              onClick={() => {
                setPresetId(option.id);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <fieldset className="mt-5">
          <legend className="font-label text-stone text-[0.6rem]">MAP COLOUR</legend>
          <div className="border-hairline mt-2 grid grid-cols-3 border-y">
            {VISUAL_PRESETS.map((preset) => (
              <label
                key={preset.id}
                className={`export-palette-option focus-within:outline-ink relative cursor-pointer border-r px-2 py-3 text-center last:border-r-0 focus-within:z-10 focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 ${paletteId === preset.id ? 'export-palette-option-active' : ''}`}
              >
                <input
                  checked={paletteId === preset.id}
                  className="sr-only"
                  name="export-map-colour"
                  type="radio"
                  value={preset.id}
                  onChange={() => {
                    setPaletteOverride(preset.id);
                  }}
                />
                <span
                  className={`export-palette-swatch appearance-swatch-${preset.id}`}
                  aria-hidden="true"
                />
                <span className="font-label mt-2 block text-[0.58rem]">
                  {preset.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="border-ink bg-paper mt-5 border p-2">
          {current === null ? (
            <p className="font-label text-stone flex min-h-40 items-center justify-center px-4 py-6 text-[0.65rem]">
              Composing image…
            </p>
          ) : 'error' in current ? (
            <p className="text-graphite flex min-h-40 items-center justify-center px-4 py-6 text-sm">
              Export failed: {current.error}.
            </p>
          ) : (
            <img
              alt={`Export preview, ${presetId}`}
              className="block max-h-[52svh] w-full object-contain"
              src={current.previewUrl}
            />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {canShareFiles ? (
            <button
              className="focus-ring border-ink bg-bone text-ink hover:bg-paper min-h-12 w-full border px-4 text-sm font-semibold"
              type="button"
              onClick={() => {
                void handleShare();
              }}
            >
              Share image
            </button>
          ) : null}
          <button
            className="focus-ring bg-ink text-bone hover:bg-graphite min-h-12 w-full px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!readyBlob}
            type="button"
            onClick={handleDownload}
          >
            Download PNG
          </button>
        </div>

        <p className="text-stone mt-3 text-xs leading-5">
          Saved as {exportFilename(list.id)}. Attribution is drawn into the image.
        </p>
      </div>
    </div>
  );
}
