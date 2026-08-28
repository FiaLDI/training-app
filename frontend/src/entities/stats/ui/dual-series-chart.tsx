'use client'

import { cn } from '@/shared/lib/cn'

export type DualSeriesPoint = {
  date: string
  primary: number | null
  secondary: number | null
}

type Props = {
  points: DualSeriesPoint[]
  primaryLabel: string
  secondaryLabel: string
  primaryUnit?: string
  secondaryUnit?: string
  className?: string
  emptyText?: string
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

export function DualSeriesChart({
  points,
  primaryLabel,
  secondaryLabel,
  primaryUnit = '',
  secondaryUnit = '',
  className,
  emptyText = 'Недостаточно данных для сравнения.',
}: Props) {
  const visible = points.filter((p) => p.primary != null || p.secondary != null)
  if (visible.length === 0) {
    return <p className={cn('text-sm text-[var(--muted)]', className)}>{emptyText}</p>
  }

  const primaryValues = visible.map((p) => p.primary).filter((v): v is number => v != null)
  const secondaryValues = visible.map((p) => p.secondary).filter((v): v is number => v != null)
  const maxPrimary = primaryValues.length > 0 ? Math.max(...primaryValues) : 1
  const maxSecondary = secondaryValues.length > 0 ? Math.max(...secondaryValues) : 1

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--accent)]" />
          {primaryLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500/80" />
          {secondaryLabel}
        </span>
      </div>

      <div className="flex gap-3">
        <div
          className="flex w-10 shrink-0 flex-col justify-between py-0 text-right text-[10px] text-[var(--muted)]"
          style={{ height: CHART_HEIGHT }}
        >
          <span>{formatValue(maxPrimary)}</span>
          <span>{formatValue(maxPrimary / 2)}</span>
          <span>0</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
            <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-[var(--border)]/70" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--border)]/50" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-[var(--border)]" />

            {visible.map((point) => {
              const primaryHeight =
                point.primary != null
                  ? Math.max(6, Math.round((point.primary / maxPrimary) * (CHART_HEIGHT - 28)))
                  : 0
              const secondaryHeight =
                point.secondary != null
                  ? Math.max(6, Math.round((point.secondary / maxSecondary) * (CHART_HEIGHT - 28)))
                  : 0

              return (
                <div
                  key={point.date}
                  className="relative z-[1] flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5"
                  title={[
                    point.primary != null ? `${primaryLabel}: ${formatValue(point.primary)}${primaryUnit ? ` ${primaryUnit}` : ''}` : null,
                    point.secondary != null ? `${secondaryLabel}: ${formatValue(point.secondary)}${secondaryUnit ? ` ${secondaryUnit}` : ''}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                >
                  <div className="flex w-full max-w-12 items-end justify-center gap-0.5">
                    {point.primary != null ? (
                      <div
                        className="w-[45%] rounded-t-sm bg-[var(--accent)]/85"
                        style={{ height: primaryHeight }}
                      />
                    ) : (
                      <div className="w-[45%]" />
                    )}
                    {point.secondary != null ? (
                      <div
                        className="w-[45%] rounded-t-sm bg-emerald-500/80"
                        style={{ height: secondaryHeight }}
                      />
                    ) : (
                      <div className="w-[45%]" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-2 flex gap-1.5">
            {visible.map((point) => (
              <span
                key={point.date}
                className="min-w-0 flex-1 truncate text-center text-[10px] text-[var(--muted)]"
              >
                {formatShortDate(point.date)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Вес тела — последняя запись за день (переносится вперёд) · сила — макс. рабочий вес за день
      </p>
    </div>
  )
}
