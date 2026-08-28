'use client'

import { buildYearHeatmap } from '@/entities/training/lib/activity-calendar'
import type { ActivityStatPoint } from '@/entities/stats/model/types'
import { cn } from '@/shared/lib/cn'
import { formatNumber } from '@/shared/lib/format'

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-[var(--border)]/50',
  1: 'bg-[var(--accent)]/25',
  2: 'bg-[var(--accent)]/45',
  3: 'bg-[var(--accent)]/70',
  4: 'bg-[var(--accent)]',
}

type Props = {
  points: ActivityStatPoint[]
  className?: string
}

export function ActivityHeatmap({ points, className }: Props) {
  const { weeks, total, maxVolume } = buildYearHeatmap(points)

  return (
    <section className={cn(className)}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Активность</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight">
            {total}
            <span className="ml-2 text-sm font-normal text-[var(--muted)]">
              {total === 1 ? 'день с тренировкой за год' : 'дней с тренировкой за год'}
            </span>
          </p>
        </div>
        {maxVolume > 0 ? (
          <p className="pb-1 text-xs text-[var(--muted)]">
            макс. {formatNumber(Math.round(maxVolume))} кг×повт./день
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full gap-[3px] md:min-w-0">
          {weeks.map((week) => (
            <div key={week[0]?.date ?? Math.random()} className="flex flex-col gap-[3px]">
              {week.map((day) => {
                const title = day.isFuture
                  ? `${day.date}: впереди`
                  : day.volume > 0
                    ? `${day.date}: ${day.sessionCount} сесс., ${formatNumber(Math.round(day.volume))} кг×повт.`
                    : `${day.date}: отдых`

                return (
                  <div
                    key={day.date}
                    title={title}
                    className={cn(
                      'size-[11px] rounded-sm sm:size-3',
                      day.isFuture ? 'border border-[var(--border)] bg-transparent' : LEVEL_CLASS[day.level],
                      day.isToday && 'ring-1 ring-[var(--foreground)]/35',
                    )}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-[var(--muted)]">
        <span>Меньше</span>
        <span className="inline-flex items-center gap-1">
          {( [0, 1, 2, 3, 4] as const).map((level) => (
            <span key={level} className={cn('size-3 rounded-sm', LEVEL_CLASS[level])} />
          ))}
        </span>
        <span>Больше</span>
      </div>
    </section>
  )
}
