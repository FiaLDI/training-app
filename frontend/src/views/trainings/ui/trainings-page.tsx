'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { StartTrainingButton } from '@/features/start-training/ui/start-training-button'
import { useSessionStore } from '@/entities/session/model/store'
import type { Training, TrainingStatus } from '@/entities/training/model/types'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { useTemplateStore } from '@/entities/template/model/store'
import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/format'
import { isTrainingPendingSync } from '@/shared/lib/training-sync-meta'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { ListSkeleton } from '@/shared/ui/skeleton'

type StatusFilter = 'all' | 'finished' | 'planned' | 'cancelled'

const PAGE_SIZE = 10

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
  const mode = useSessionStore((s) => s.mode)
  const items = useTrainingStore((s) => s.listItems)
  const total = useTrainingStore((s) => s.listTotal)
  const loading = useTrainingStore((s) => s.listLoading)
  const error = useTrainingStore((s) => s.listError)
  const fetchListPage = useTrainingStore((s) => s.fetchListPage)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  useEffect(() => {
    const status: TrainingStatus | undefined =
      statusFilter === 'all' ? undefined : statusFilter
    void fetchListPage({ page, limit: PAGE_SIZE, status })
  }, [fetchListPage, page, statusFilter])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1)

  useEffect(() => {
    if (total > 0 && page > pageCount) {
      setPage(pageCount)
    }
  }, [total, page, pageCount])

  function trainingLabel(templateId: string | null) {
    if (!templateId) return 'Тренировка'
    return templates.find((t) => t.id === templateId)?.name ?? 'Тренировка'
  }

  function changeStatus(next: StatusFilter) {
    setStatusFilter(next)
    setPage(1)
  }

  return (
    <div className='max-w-xl mx-auto'>
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
              onClick={() => changeStatus(option.id)}
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
      ) : items.length === 0 ? (
        <EmptyState>{EMPTY_BY_FILTER[statusFilter]}</EmptyState>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((training) => {
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
                      {mode === 'cloud' && isTrainingPendingSync(training) ? (
                        <p className="mt-1 text-xs text-amber-300/90">Не на сервере</p>
                      ) : null}
                    </div>
                    <TrainingStatusBadge status={training.status} />
                  </Link>
                </li>
              )
            })}
          </ul>

          {total > PAGE_SIZE ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
              <p className="text-xs text-[var(--muted)]">
                Страница {page} из {pageCount}
                {` · ${total}`}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Назад
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= pageCount || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Далее
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
