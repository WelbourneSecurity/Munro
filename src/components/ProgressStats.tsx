import type { ProgressStats as ProgressStatsData } from '../domain';

interface ProgressStatsProps {
  stats: ProgressStatsData;
}

export function ProgressStats({ stats }: ProgressStatsProps) {
  return (
    <div>
      {/* aria-live announces the new count to screen readers when a peak is
          bagged or unbagged from the list panel or the map. */}
      <div aria-live="polite" className="mb-3 flex items-end justify-between gap-4">
        <p className="font-label text-label text-bagged">
          {stats.bagged} / {stats.total} bagged
        </p>
        <p className="font-label text-label text-muted">{stats.percentage}%</p>
      </div>
      <div className="bg-surface h-1.5" aria-hidden="true">
        <div
          className="bg-bagged h-full transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${String(stats.percentage)}%` }}
        />
      </div>
      <p className="text-muted mt-3 text-xs leading-5">
        {stats.remaining} remaining. Progress is stored locally in this browser.
      </p>
    </div>
  );
}
