'use client'

import { cn } from '@/shared/lib/cn'

export type ChartPoint = {
  date: string
  value: number
}

type Props = {
  points: ChartPoint[]
  className?: string
  /** Подпись единицы: «кг», «кг×повт.» */
  unit?: string
  emptyText?: string
  footnote?: string | null
}

const CHART_HEIGHT = 160

function formatShortDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate.slice(5)
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatValue(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1)
}

export function SimpleBarChart({
  points,
  className,
  unit = '',
  emptyText = 'Нет данных за этот период.',
  footnote,
}: Props) {
  const visible = points
    .map((point) => ({ point, value: Number(point.value) || 0 }))
    .filter((item) => item.value > 0)

  if (visible.length === 0) {
    return <p className={cn('text-sm text-[var(--muted)]', className)}>{emptyText}</p>
  }

  const max = Math.max(...visible.map((item) => item.value))
  const mid = max / 2

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-3">
        <div className="flex w-10 shrink-0 flex-col justify-between py-0 text-right text-[10px] text-[var(--muted)]" style={{ height: CHART_HEIGHT }}>
          <span>{formatValue(max)}</span>
          <span>{formatValue(mid)}</span>
          <span>0</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
            <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-[var(--border)]/70" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--border)]/50" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-[var(--border)]" />

            {visible.map(({ point, value }) => {
              const barHeight = Math.max(8, Math.round((value / max) * (CHART_HEIGHT - 22)))
              return (
                <div
                  key={point.date}
                  className="relative z-[1] flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-1 text-[10px] font-medium tabular-nums text-[var(--foreground)]">
                    {formatValue(value)}
                  </span>
                  <div
                    className="w-full max-w-14 rounded-t-md bg-[var(--accent)]/85"
                    style={{ height: barHeight }}
                    title={`${formatShortDate(point.date)}: ${formatValue(value)}${unit ? ` ${unit}` : ''}`}
                  />
                </div>
              )
            })}
          </div>

          <div className="mt-2 flex gap-2">
            {visible.map(({ point }) => (
              <span
                key={point.date}
                className="min-w-0 flex-1 truncate text-center text-[11px] text-[var(--muted)]"
              >
                {formatShortDate(point.date)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {footnote !== null ? (
        <p className="text-xs text-[var(--muted)]">
          {footnote ?? (unit ? `Единица: ${unit} · без учёта разминки` : 'Без учёта разминки')}
        </p>
      ) : null}
    </div>
  )
}
