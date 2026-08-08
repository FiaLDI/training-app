'use client'

import type { VolumeStatPoint } from '@/entities/stats/model/types'
import { cn } from '@/shared/lib/cn'

type Props = {
  points: VolumeStatPoint[]
  className?: string
  label?: string
}

const CHART_HEIGHT = 144

export function SimpleBarChart({ points, className, label = 'Объём' }: Props) {
  const values = points.map((p) => Number(p.volume) || 0)
  const max = Math.max(1, ...values)
  const visible = points
    .map((point, i) => ({ point, volume: values[i] }))
    .filter((item) => item.volume > 0)

  if (visible.length === 0) {
    return (
      <p className={cn('text-sm text-[var(--muted)]', className)}>Нет данных за этот период.</p>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
        {visible.map(({ point, volume }) => (
          <div key={point.date} className="flex min-w-0 flex-1 justify-center">
            <div
              className="w-full max-w-12 rounded-t bg-[var(--accent)]/80"
              style={{ height: Math.max(4, Math.round((volume / max) * CHART_HEIGHT)) }}
              title={`${point.date}: ${Math.round(volume)}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {visible.map(({ point }) => (
          <span
            key={point.date}
            className="min-w-0 flex-1 truncate text-center text-[9px] text-[var(--muted)]"
          >
            {point.date.slice(5)}
          </span>
        ))}
      </div>
      <p className="text-xs text-[var(--muted)]">
        {label} · без учёта разминки
      </p>
    </div>
  )
}
