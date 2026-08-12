'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { formatSetLine, summarizeTraining } from '@/entities/stats/lib/summarize-training'
import type { Training, TrainingWithDetails } from '@/entities/training/model/types'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { EmptyState } from '@/shared/ui/empty-state'

type Props = {
  training: Training | null
  details: TrainingWithDetails | null
  title: string
  resolveExerciseName: (exerciseId: string) => string
  formatDuration: (startedAt: string | null, finishedAt: string | null) => string | null
  formatNumber: (value: number, digits?: number) => string
}

export function LastTrainingSummary({
  training,
  details,
  title,
  resolveExerciseName,
  formatDuration,
  formatNumber,
}: Props) {
  if (!training) {
    return (
      <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Последняя тренировка</h2>
        <div className="mt-4">
          <EmptyState>Завершённых тренировок пока нет.</EmptyState>
        </div>
      </section>
    )
  }

  const when = training.finishedAt ?? training.startedAt ?? training.createdAt
  const duration = formatDuration(training.startedAt, training.finishedAt)
  const summary = details ? summarizeTraining(details, resolveExerciseName) : null

  return (
    <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl">Последняя тренировка</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {new Date(when).toLocaleString('ru-RU')}
            {duration ? ` · ${duration}` : ''}
          </p>
        </div>
        <TrainingStatusBadge status={training.status} />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4">
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>

        {summary ? (
          <>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {summary.exerciseCount}{' '}
              {summary.exerciseCount === 1
                ? 'упражнение'
                : summary.exerciseCount < 5
                  ? 'упражнения'
                  : 'упражнений'}
              {' · '}
              {summary.setCount}{' '}
              {summary.setCount === 1 ? 'подход' : summary.setCount < 5 ? 'подхода' : 'подходов'}
              {summary.volume > 0 ? (
                <>
                  {' · '}
                  {formatNumber(Math.round(summary.volume))} кг×повт.
                </>
              ) : null}
            </p>

            {summary.exercises.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {summary.exercises.map((exercise) => (
                  <li
                    key={exercise.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {exercise.name}
                      {exercise.isWarmup ? (
                        <span className="ml-2 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sky-300">
                          Разминка
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">
                      {formatSetLine(exercise.sets)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">Подходы не записаны.</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">Загрузка деталей…</p>
        )}

        <Link
          href={`/trainings/${training.id}`}
          className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
        >
          Открыть тренировку
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  )
}
