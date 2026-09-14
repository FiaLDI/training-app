'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { coachApi } from '@/entities/coach/api/coach-api'
import type { SetComment, TraineeTrainingView } from '@/entities/coach/model/types'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { SetComments } from '@/features/set-comments/ui/set-comments'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { formatKg } from '@/entities/training/lib/session-weight'
import { PageHeader } from '@/shared/ui/page-header'
import { DetailSkeleton } from '@/shared/ui/skeleton'

type Props = {
  traineeId: string
  trainingId: string
}

export function TraineeTrainingPage({ traineeId, trainingId }: Props) {
  const exercises = useExerciseStore((s) => s.items)
  const fetchExercises = useExerciseStore((s) => s.fetchList)
  const [data, setData] = useState<TraineeTrainingView | null>(null)
  const [comments, setComments] = useState<SetComment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchExercises()
  }, [fetchExercises])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void coachApi
      .getTraining(traineeId, trainingId)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setComments(result.comments)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [traineeId, trainingId])

  if (loading && !data) return <DetailSkeleton />
  if (error || !data) {
    return <p className="text-sm text-red-300">{error ?? 'Тренировка не найдена'}</p>
  }

  const { training } = data
  const sorted = [...training.exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)

  return (
    <div>
      <Link
        href={`/coach/trainees/${traineeId}`}
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        К подопечному
      </Link>
      <PageHeader
        title={
          training.scheduledAt
            ? new Date(training.scheduledAt).toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : 'Тренировка'
        }
        action={<TrainingStatusBadge status={training.status} />}
      />

      <div className="space-y-6">
        {sorted.map((exercise) => (
          <section
            key={exercise.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <h2 className="font-[family-name:var(--font-display)] text-lg">
              {exercises.find((item) => item.id === exercise.exerciseId)?.name ??
                exercise.exerciseId.slice(0, 8)}
            </h2>
            <ul className="mt-3 space-y-3">
              {exercise.sets.map((set) => (
                <li key={set.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">Подход {set.setNumber}</span>
                    <span className="tabular-nums">
                      {set.weight != null ? `${formatKg(set.weight)} кг` : '—'} ×{' '}
                      {set.reps ?? '—'}
                    </span>
                  </div>
                  <SetComments
                    setId={set.id}
                    comments={comments}
                    canComment
                    onCommented={(comment) => setComments((prev) => [...prev, comment])}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
