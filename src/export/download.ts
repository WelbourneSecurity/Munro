// Small browser-side helpers for saving the composed export image. These are
// deliberately NOT re-exported from src/export/index.ts: the dialog imports
// them statically (they are a few lines of DOM code), while the composition
// engine behind index.ts stays behind a dynamic import so it is code-split
// out of the initial bundle (see T6.4 in wiki/implementation-plan.md).

/**
 * `munro-<listId>-<yyyy-mm-dd>.png`, using the local calendar date. The list
 * id comes from the hill-list registry (`src/data/lists.ts`), so exports name
 * the list they show — `munro-munros-…` for the Munros, and so on.
 */
export function exportFilename(listId: string, date: Date = new Date()): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `munro-${listId}-${year}-${month}-${day}.png`;
}

/** Save a blob via a temporary object URL and a synthetic anchor click. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
