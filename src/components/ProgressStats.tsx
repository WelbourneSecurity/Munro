import type { ProgressStats as ProgressStatsData } from '../domain';

interface ProgressStatsProps {
  stats: ProgressStatsData;
  label?: string;
}

export function ProgressStats({ stats, label = 'Hills bagged' }: ProgressStatsProps) {
  return (
    <div
      className="grid gap-5 md:grid-cols-[auto_1fr] md:items-end md:gap-10"
      aria-live="polite"
    >
      <div>
        <p className="font-label text-stone text-[0.65rem] tracking-[0.05em]">
          {label}
        </p>
        <p className="mt-2 flex items-baseline gap-3 tabular-nums">
          <span className="text-5xl font-semibold tracking-[-0.065em] md:text-7xl">
            {stats.bagged}
          </span>
          <span className="font-label text-stone text-xs">/ {stats.total}</span>
          <span className="sr-only"> bagged</span>
        </p>
      </div>
      <div className="pb-1">
        <div className="mb-3 flex items-end justify-between gap-4">
          <p className="text-graphite text-sm">{stats.remaining} hills remain</p>
          <p className="font-label text-stone text-[0.68rem] tabular-nums">
            {stats.percentage}%
          </p>
        </div>
        <div className="bg-hairline h-px" aria-hidden="true">
          <div
            className="bg-ink h-px transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${String(stats.percentage)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
