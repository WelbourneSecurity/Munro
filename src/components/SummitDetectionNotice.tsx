import { useEffect } from 'react';

import type { Peak } from '../domain';

export const SUMMIT_NOTICE_DURATION_MS = 12_000;

function formatPeakNames(peaks: Peak[]) {
  const names = peaks.map((peak) => peak.name);

  if (names.length <= 1) {
    return names.join('');
  }

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] ?? ''}`;
}

/**
 * A calm confirmation that summit detection has bagged one or more peaks.
 * Quietly fades out of relevance: it dismisses itself after a short while
 * and can be dismissed by hand. No sound, no animation, no celebration —
 * the summit was the celebration.
 */
export function SummitDetectionNotice({
  peaks,
  onDismiss,
}: {
  peaks: Peak[];
  onDismiss: () => void;
}) {
  const visible = peaks.length > 0;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(onDismiss, SUMMIT_NOTICE_DURATION_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [visible, peaks, onDismiss]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="border-line bg-panel fixed bottom-4 left-1/2 z-30 w-[min(92vw,26rem)] -translate-x-1/2 border px-4 py-3"
      role="status"
    >
      <p className="font-label text-label text-bagged">Summit reached</p>
      <p className="text-secondary mt-1 text-sm leading-6">
        {formatPeakNames(peaks)} marked as bagged.
      </p>
      <button
        className="font-label text-label text-muted hover:text-primary focus-visible:outline-bagged mt-2 min-h-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        type="button"
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  );
}
