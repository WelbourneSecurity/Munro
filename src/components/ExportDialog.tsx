import { useEffect, useMemo, useRef, useState } from 'react';
// maplibre-gl appears here with `import type` ONLY — the type is erased at
// compile time. The live map object is passed in by reference from MapView,
// which stays the only module touching maplibre-gl at runtime.
import type { Map as MapLibreMap } from 'maplibre-gl';

import type { HillListDefinition } from '../data/lists';
import { downloadBlob, exportFilename } from '../export/download';
import type { ExportPresetId, MapSnapshot } from '../export';

interface ExportStats {
  bagged: number;
  total: number;
}

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** The live MapLibre map, or null while it is still loading. */
  getMap: () => MapLibreMap | null;
  /** The active hill list: frames its bounds, titles and names the image. */
  list: HillListDefinition;
  stats: ExportStats;
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

// CSS pixels of map kept clear around the fitted boundary in the snapshot.
const EXPORT_FRAME_PADDING = 48;

// The export layout sizes its map box from how many lines the attribution
// wraps to, which is only known once compose measures the text. Two lines is
// the typical count at both presets; the frame padding above absorbs the
// small aspect drift when the real count differs by a line.
const ATTRIBUTION_LINES_ESTIMATE = 2;

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
  getMap,
  list,
  stats,
}: ExportDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Compose runs mutate the shared map camera (frame → capture → restore), so
  // they must never overlap: each run is chained onto the previous one and
  // only reads the camera after the previous run's restore() has put the
  // user's viewport back. The chain is kept settled so a failed run never
  // blocks later ones.
  const composeQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [presetId, setPresetId] = useState<ExportPresetId>('portrait');
  const [outcome, setOutcome] = useState<ComposeOutcome | null>(null);
  const { bagged, total } = stats;

  // The outcome only applies while its inputs match; otherwise a new
  // composition is in flight and the dialog shows the quiet busy state.
  const composeKey = `${list.id}:${presetId}:${String(bagged)}:${String(total)}`;
  const current = open && outcome?.key === composeKey ? outcome.result : null;
  const readyBlob = current && 'blob' in current ? current.blob : null;

  function handleClose() {
    setOutcome(null);
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
    const key = `${list.id}:${presetId}:${String(bagged)}:${String(total)}`;

    const compose = async (): Promise<Blob> => {
      // A queued run whose effect has already been cleaned up (preset
      // toggled again, dialog closed) would frame, capture and restore the
      // shared map camera for an image nobody can see — with the dialog
      // gone, the user would just watch their map jump to the export
      // framing and back. Bail before touching the map.
      if (cancelled) {
        throw new Error('superseded before composing started');
      }

      const map = getMap();

      if (!map) {
        throw new Error('the map has not finished loading yet');
      }

      // Dynamic import keeps the composition engine in its own chunk.
      const engine = await import('../export');
      const preset = engine.getExportPreset(presetId);
      const layout = engine.layoutExport(preset, ATTRIBUTION_LINES_ESTIMATE);

      // Frame the active list's bounds at the destination map box's aspect
      // (frameBoundary widens the fit padding via coverCropPadding so the
      // later centre-crop trims only padding), capture, then always restore
      // the user's exact viewport — even when the capture fails.
      const restore = await engine.frameBoundary(
        map,
        list.bounds,
        EXPORT_FRAME_PADDING,
        layout.map.width / layout.map.height,
      );

      let snapshot: MapSnapshot;

      try {
        snapshot = await engine.captureMap(map);
      } finally {
        restore();
      }

      return engine.composeExport(
        snapshot,
        { bagged, total },
        { preset: presetId, title: `${list.regionLabel} · ${list.name}` },
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
    };
  }, [open, presetId, getMap, bagged, total, list]);

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
    <div className="bg-surface/80 fixed inset-0 z-50 flex items-center justify-center pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
      <div
        ref={dialogRef}
        aria-labelledby="export-dialog-title"
        aria-modal="true"
        className="border-line bg-panel max-h-[92svh] w-full max-w-md overflow-y-auto border p-5 focus:outline-none"
        role="dialog"
        tabIndex={-1}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-label text-label text-muted">{list.regionLabel}</p>
            <h2
              id="export-dialog-title"
              className="text-primary mt-1 text-xl font-semibold"
            >
              Export image
            </h2>
          </div>
          <button
            className="border-line bg-panel text-secondary hover:text-primary focus-visible:outline-bagged min-h-11 min-w-11 border px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            type="button"
            onClick={handleClose}
          >
            Close
          </button>
        </div>

        <p aria-atomic="true" className="sr-only" role="status">
          {statusMessage}
        </p>

        <div
          aria-label="Export preset"
          className="border-line grid grid-cols-2 border"
          role="group"
        >
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option.id}
              aria-pressed={presetId === option.id}
              className={`font-label text-label border-r-line min-h-11 border-r px-2 transition-colors last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                presetId === option.id
                  ? // The inset ring sits on the bagged-green fill, so it uses
                    // the dark surface token — outline-bagged would vanish.
                    'bg-bagged text-surface focus-visible:outline-surface'
                  : 'bg-panel text-secondary hover:text-primary focus-visible:outline-bagged'
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

        <div className="border-line bg-surface mt-4 border">
          {current === null ? (
            <p className="font-label text-label text-muted flex min-h-40 items-center justify-center px-4 py-6">
              Composing image…
            </p>
          ) : 'error' in current ? (
            <p className="text-secondary flex min-h-40 items-center justify-center px-4 py-6 text-sm">
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
              className="border-line bg-panel text-primary hover:border-bagged hover:text-bagged focus-visible:outline-bagged min-h-11 w-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              type="button"
              onClick={() => {
                void handleShare();
              }}
            >
              Share image
            </button>
          ) : null}
          <button
            className="border-line bg-panel text-primary hover:border-bagged hover:text-bagged focus-visible:outline-bagged min-h-11 w-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!readyBlob}
            type="button"
            onClick={handleDownload}
          >
            Download PNG
          </button>
        </div>

        <p className="text-muted mt-3 text-xs leading-5">
          Saved as {exportFilename(list.id)}. Attribution is drawn into the image.
        </p>
      </div>
    </div>
  );
}
