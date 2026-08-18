'use client'

import { useEffect, useMemo } from 'react'
import { Trash2 } from 'lucide-react'

import { useBodyMeasurementStore } from '@/entities/body-measurement/model/store'
import { SimpleBarChart } from '@/entities/stats/ui/simple-bar-chart'
import { LogBodyWeightForm } from '@/features/log-body-weight/ui/log-body-weight-form'
import { formatNumber } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'

type Props = {
  from?: string
  to?: string
}

function latestWeightPerDay(
  items: Array<{ measuredAt: string; weight: number }>,
): Array<{ date: string; value: number }> {
  const byDate = new Map<string, { measuredAt: string; weight: number }>()
  for (const item of items) {
    const date = item.measuredAt.slice(0, 10)
    const current = byDate.get(date)
    if (!current || item.measuredAt.localeCompare(current.measuredAt) > 0) {
      byDate.set(date, item)
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, item]) => ({ date, value: item.weight }))
}

export function BodyWeightSection({ from, to }: Props) {
  const items = useBodyMeasurementStore((s) => s.items)
  const loading = useBodyMeasurementStore((s) => s.loading)
  const fetchList = useBodyMeasurementStore((s) => s.fetchList)
  const remove = useBodyMeasurementStore((s) => s.remove)

  useEffect(() => {
    void fetchList({ from, to })
  }, [fetchList, from, to])

  const chartPoints = useMemo(() => latestWeightPerDay(items), [items])
  const latest = items[0] ?? null
  const previous = items[1] ?? null
  const delta =
    latest && previous ? latest.weight - previous.weight : null

  return (
    <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl">Мой вес</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {latest
              ? `Сейчас ${formatNumber(latest.weight, 1)} кг${
                  delta != null
                    ? ` (${delta > 0 ? '+' : ''}${formatNumber(delta, 1)} к последней записи)`
                    : ''
                }`
              : 'Запиши вес, чтобы отслеживать динамику'}
          </p>
        </div>
        <LogBodyWeightForm onLogged={() => void fetchList({ from, to })} />
      </div>

      {loading && items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Загрузка…</p>
      ) : chartPoints.length === 0 ? (
        <EmptyState>Записей веса пока нет.</EmptyState>
      ) : (
        <SimpleBarChart
          points={chartPoints}
          unit="кг"
          footnote="кг · последняя запись за день"
          emptyText="Записей веса пока нет."
        />
      )}

      {items.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium tabular-nums text-[var(--foreground)]">
                  {formatNumber(item.weight, 1)} кг
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {new Date(item.measuredAt).toLocaleString('ru-RU')}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="px-2"
                onClick={() => void remove(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
