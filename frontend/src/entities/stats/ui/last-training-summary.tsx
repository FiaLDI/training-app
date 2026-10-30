'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Dumbbell, Layers, Timer } from 'lucide-react'

import { summarizeTraining } from '@/entities/stats/lib/summarize-training'
import type { Training, TrainingWithDetails } from '@/entities/training/model/types'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { cn } from '@/shared/lib/cn'
import { formatDuration, formatNumber } from '@/shared/lib/format'
import { EmptyState } from '@/shared/ui/empty-state'

type Props = {
  training: Training | null
  details: TrainingWithDetails | null
  resolveExerciseName: (exerciseId: string) => string
  className?: string
}

function pluralRu(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function StatCell({
  icon,
  value,
  label,
}: {
  icon: ReactNode
  value: string
  label: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--accent)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
        <p className="text-sm text-[var(--muted)]">{label}</p>
      </div>
    </div>
  )
}

export function LastTrainingSummary({
  training,
  details,
  resolveExerciseName,
  className,
}: Props) {
  if (!training) {
    return (
      <section
        className={cn(
          'mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5',
          className,
        )}
      >
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

  const exerciseCount = summary?.exerciseCount ?? null
  const setCount = summary?.setCount ?? null
  const volume = summary?.volume ?? null

  return (
    <section
      className={cn(
        'mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl">Последняя тренировка</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {new Date(when).toLocaleString('ru-RU')}
          </p>
        </div>
        <TrainingStatusBadge status={training.status} className="rounded-full" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
        <StatCell
          icon={<Dumbbell className="size-5" />}
          value={exerciseCount == null ? '—' : String(exerciseCount)}
          label={
            exerciseCount == null
              ? 'упражнений'
              : pluralRu(exerciseCount, 'упражнение', 'упражнения', 'упражнений')
          }
        />
        <StatCell
          icon={<Layers className="size-5" />}
          value={setCount == null ? '—' : String(setCount)}
          label={
            setCount == null ? 'подходов' : pluralRu(setCount, 'подход', 'подхода', 'подходов')
          }
        />
        <StatCell
          icon={<Layers className="size-5" />}
          value={
            volume == null || volume <= 0 ? '—' : `${formatNumber(Math.round(volume))} кг`
          }
          label="общий объём"
        />
        <StatCell
          icon={<Timer className="size-5" />}
          value={duration ?? '—'}
          label="длительность"
        />
      </div>

      <Link
        href={`/trainings/${training.id}`}
        className="mt-5 flex w-full items-center justify-center gap-1.5 border-t border-[var(--border)] pt-4 text-sm text-[var(--foreground)] transition hover:text-[var(--accent)]"
      >
        Посмотреть детали
        <ArrowRight className="size-4" />
      </Link>
    </section>
  )
}
