'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { StartTrainingButton } from '@/features/start-training/ui/start-training-button'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingActivityCalendar } from '@/entities/training/ui/training-activity-calendar'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { useTemplateStore } from '@/entities/template/model/store'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { ListSkeleton } from '@/shared/ui/skeleton'

export function DashboardPage() {
  const trainings = useTrainingStore((s) => s.items)
  const fetchTrainings = useTrainingStore((s) => s.fetchList)
  const loading = useTrainingStore((s) => s.loading)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)

  useEffect(() => {
    void fetchTrainings({ limit: 100 })
    void fetchTemplates()
  }, [fetchTrainings, fetchTemplates])

  const active = trainings.find((item) => item.status === 'in_progress')
  const recent = trainings.slice(0, 5)

  return (
    <div>
      <PageHeader
        title="Train today"
        description="Start a session from a template or build one on the fly."
        action={<StartTrainingButton />}
      />

      {active ? (
        <Link
          href={`/trainings/${active.id}`}
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-5 transition hover:bg-[var(--accent)]/15"
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Active session</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl">
              Continue workout
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Started {new Date(active.startedAt).toLocaleString()}
            </p>
          </div>
          <ArrowRight className="size-5 text-[var(--accent)]" />
        </Link>
      ) : null}

      <TrainingActivityCalendar trainings={trainings} />

      <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">Recent trainings</h2>
      {loading && recent.length === 0 ? (
        <ListSkeleton count={3} />
      ) : recent.length === 0 ? (
        <EmptyState>No trainings yet. Start your first session.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {recent.map((training) => (
            <li key={training.id}>
              <Link
                href={`/trainings/${training.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--accent)]/30"
              >
                <div>
                  <p className="text-sm text-[var(--foreground)]">
                    {new Date(training.startedAt).toLocaleString()}
                  </p>
                  {training.notes ? (
                    <p className="text-xs text-[var(--muted)]">{training.notes}</p>
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
