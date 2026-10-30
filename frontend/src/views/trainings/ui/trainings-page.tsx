'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { StartTrainingButton } from '@/features/start-training/ui/start-training-button'
import { statsPeriodRange } from '@/entities/stats/lib/period-range'
import type { Training } from '@/entities/training/model/types'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { useTemplateStore } from '@/entities/template/model/store'
import { setVisibleTrainingWindow } from '@/shared/lib/cloud-sync-state'
import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/format'
import { isTrainingPendingSync } from '@/shared/lib/training-sync-meta'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { ListSkeleton } from '@/shared/ui/skeleton'

type StatusFilter = 'all' | 'finished' | 'planned' | 'cancelled'

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'finished', label: 'Завершены' },
  { id: 'planned', label: 'Запланированы' },
  { id: 'cancelled', label: 'Отменены' },
]

const EMPTY_BY_FILTER: Record<StatusFilter, string> = {
  all: 'Пока нет записанных тренировок.',
  finished: 'Пока нет завершённых тренировок.',
  planned: 'Нет запланированных тренировок.',
  cancelled: 'Нет отменённых тренировок.',
}

function trainingWhen(training: Training) {
  if (training.status === 'planned') return training.scheduledAt ?? training.createdAt
  if (training.status === 'finished') {
    return training.finishedAt ?? training.startedAt ?? training.createdAt
  }
  return training.startedAt ?? training.scheduledAt ?? training.createdAt
}

export function TrainingsPage() {
  const items = useTrainingStore((s) => s.items)
  const loading = useTrainingStore((s) => s.loading)
  const error = useTrainingStore((s) => s.error)
  const fetchList = useTrainingStore((s) => s.fetchList)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    const range = statsPeriodRange('year')
    setVisibleTrainingWindow(range.from, range.to)
    void fetchList({ from: range.from, to: range.to, limit: 200 })
    void fetchTemplates()
  }, [fetchList, fetchTemplates])

  const listed = useMemo(() => {
    return items
      .filter((t) => (statusFilter === 'all' ? true : t.status === statusFilter))
      .sort((a, b) => trainingWhen(b).localeCompare(trainingWhen(a)))
  }, [items, statusFilter])

  function trainingLabel(templateId: string | null) {
    if (!templateId) return 'Тренировка'
    return templates.find((t) => t.id === templateId)?.name ?? 'Тренировка'
  }

  return (
    <div>
      <PageHeader
        title="Тренировки"
        description="Список сессий с фильтром по статусу."
        action={<StartTrainingButton />}
      />

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
        {STATUS_FILTERS.map((option) => {
          const active = option.id === statusFilter
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setStatusFilter(option.id)}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-sm transition',
                active
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {loading && items.length === 0 ? (
        <ListSkeleton />
      ) : listed.length === 0 ? (
        <EmptyState>{EMPTY_BY_FILTER[statusFilter]}</EmptyState>
      ) : (
        <ul className="space-y-2">
          {listed.map((training) => {
            const when = trainingWhen(training)
            const duration = formatDuration(training.startedAt, training.finishedAt)
            return (
              <li key={training.id}>
                <Link
                  href={`/trainings/${training.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--accent)]/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {trainingLabel(training.templateId)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {new Date(when).toLocaleString('ru-RU')}
                      {duration ? ` · ${duration}` : ''}
                    </p>
                    {isTrainingPendingSync(training) ? (
                      <p className="mt-1 text-xs text-amber-300/90">Не на сервере</p>
                    ) : null}
                  </div>
                  <TrainingStatusBadge status={training.status} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
