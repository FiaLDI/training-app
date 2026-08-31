'use client'

import { cn } from '@/shared/lib/cn'
import { formatNumber } from '@/shared/lib/format'

export type MuscleGroupChartPoint = {
  label: string
  volume: number
  sets: number
}

type Props = {
  groups: MuscleGroupChartPoint[]
  className?: string
  emptyText?: string
}

export function MuscleGroupChart({
  groups,
  className,
  emptyText = 'Нет данных за этот период.',
}: Props) {
  const visible = groups.filter((g) => g.volume > 0 || g.sets > 0)
  if (visible.length === 0) {
    return <p className={cn('text-sm text-[var(--muted)]', className)}>{emptyText}</p>
  }

  const maxVolume = Math.max(...visible.map((g) => g.volume))

  return (
    <div className={cn('space-y-3', className)}>
      <ul className="space-y-2.5">
        {visible.map((group) => {
          const width = maxVolume > 0 ? Math.max(4, Math.round((group.volume / maxVolume) * 100)) : 0
          return (
            <li key={group.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate capitalize text-[var(--foreground)]">{group.label}</span>
                <span className="shrink-0 tabular-nums text-[var(--muted)]">
                  {formatNumber(Math.round(group.volume))} кг×повт.
                  {group.sets > 0 ? ` · ${formatNumber(group.sets, group.sets % 1 === 0 ? 0 : 1)} подх.` : ''}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]/60">
                <div
                  className="h-full rounded-full bg-[var(--accent)]/85 transition-[width]"
                  style={{ width: `${width}%` }}
                  title={`${group.label}: ${formatNumber(Math.round(group.volume))} кг×повт.`}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-[var(--muted)]">
        Основная группа — полный объём, дополнительные — ×0.6 · без разминочных подходов
      </p>
    </div>
  )
}
