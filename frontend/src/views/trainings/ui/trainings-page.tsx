'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { StartTrainingButton } from '@/features/start-training/ui/start-training-button'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { useTemplateStore } from '@/entities/template/model/store'
import { isTrainingPendingSync } from '@/shared/lib/training-sync-meta'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { ListSkeleton } from '@/shared/ui/skeleton'

export function TrainingsPage() {
  const items = useTrainingStore((s) => s.items)
  const loading = useTrainingStore((s) => s.loading)
  const error = useTrainingStore((s) => s.error)
  const fetchList = useTrainingStore((s) => s.fetchList)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)

  useEffect(() => {
    void fetchList()
    void fetchTemplates()
  }, [fetchList, fetchTemplates])

  return (
    <div>
      <PageHeader
        title="История"
        description="Прошедшие и запланированные сессии."
        action={<StartTrainingButton />}
      />

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {loading && items.length === 0 ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState>Пока нет записанных тренировок.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((training) => (
            <li key={training.id}>
              <Link
                href={`/trainings/${training.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--accent)]/30"
              >
                <div>
                  <p className="text-sm text-[var(--foreground)]">
                    {training.startedAt
                      ? new Date(training.startedAt).toLocaleString('ru-RU')
                      : training.scheduledAt
                        ? `Запланировано ${new Date(training.scheduledAt).toLocaleString('ru-RU')}`
                        : 'Без названия'}
                  </p>
                  {training.finishedAt ? (
                    <p className="text-xs text-[var(--muted)]">
                      Завершена {new Date(training.finishedAt).toLocaleString('ru-RU')}
                    </p>
                  ) : null}
                  {isTrainingPendingSync(training) ? (
                    <p className="mt-1 text-xs text-amber-300/90">Не на сервере</p>
                  ) : null}
                </div>
                <TrainingStatusBadge status={training.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
