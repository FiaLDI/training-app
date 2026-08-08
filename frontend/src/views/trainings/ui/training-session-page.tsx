'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Play, Trash2 } from 'lucide-react'

import { AddTrainingExerciseForm } from '@/features/add-training-exercise/ui/add-training-exercise-form'
import { LogSetForm } from '@/features/log-set/ui/log-set-form'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { DetailSkeleton } from '@/shared/ui/skeleton'

type Props = {
  id: string
}

export function TrainingSessionPage({ id }: Props) {
  const router = useRouter()
  const current = useTrainingStore((s) => s.current)
  const loading = useTrainingStore((s) => s.loading)
  const error = useTrainingStore((s) => s.error)
  const fetchOne = useTrainingStore((s) => s.fetchOne)
  const start = useTrainingStore((s) => s.start)
  const finish = useTrainingStore((s) => s.finish)
  const remove = useTrainingStore((s) => s.remove)
  const removeSet = useTrainingStore((s) => s.removeSet)
  const exercises = useExerciseStore((s) => s.items)
  const fetchExercises = useExerciseStore((s) => s.fetchList)

  useEffect(() => {
    void fetchOne(id)
    void fetchExercises()
  }, [id, fetchOne, fetchExercises])

  const exerciseName = (exerciseId: string) =>
    exercises.find((item) => item.id === exerciseId)?.name ?? exerciseId.slice(0, 8)

  if (loading && !current) {
    return <DetailSkeleton />
  }

  if (error || !current) {
    return <p className="text-sm text-red-300">{error ?? 'Тренировка не найдена'}</p>
  }

  const canEdit = current.status === 'in_progress' || current.status === 'planned'
  const whenLabel =
    current.status === 'planned' && current.scheduledAt
      ? `Запланировано ${new Date(current.scheduledAt).toLocaleString('ru-RU')}`
      : current.startedAt
        ? `Начата ${new Date(current.startedAt).toLocaleString('ru-RU')}`
        : 'Не начата'

  return (
    <div>
      <Link
        href="/trainings"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Тренировки
      </Link>

      <PageHeader
        title="Тренировка"
        description={whenLabel}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <TrainingStatusBadge status={current.status} />
            {current.status === 'planned' ? (
              <Button
                type="button"
                onClick={() =>
                  void start(id).then(() => {
                    router.refresh()
                  })
                }
              >
                <Play className="size-4" />
                Старт
              </Button>
            ) : null}
            {canEdit && current.status === 'in_progress' ? (
              <Button type="button" onClick={() => void finish(id)}>
                <CheckCircle2 className="size-4" />
                Завершить
              </Button>
            ) : null}
            <Button
              type="button"
              variant="danger"
              onClick={() =>
                void remove(id).then(() => {
                  window.location.href = '/trainings'
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        }
      />

      {current.exercises.length === 0 ? (
        <EmptyState>Добавь упражнения, чтобы записывать подходы.</EmptyState>
      ) : (
        <div className="space-y-4">
          {current.exercises.map((exercise) => (
            <section
              key={exercise.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg">
                    {exerciseName(exercise.exerciseId)}
                    {exercise.isWarmup ? (
                      <span className="ml-2 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sky-300">
                        Разминка
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Цель: {exercise.targetSets} подходов
                    {exercise.minReps != null || exercise.maxReps != null
                      ? ` · ${exercise.minReps ?? '?'}–${exercise.maxReps ?? '?'} повт.`
                      : ''}
                    {typeof exercise.metadata?.targetWeight === 'number'
                      ? ` · ${exercise.metadata.targetWeight} кг`
                      : ''}
                  </p>
                </div>
              </div>

              {exercise.sets.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {exercise.sets.map((set) => (
                    <li
                      key={set.id}
                      className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm"
                    >
                      <span>
                        Подход {set.setNumber}
                        {set.weight != null ? ` · ${set.weight} кг` : ''}
                        {set.reps != null ? ` · ${set.reps} повт.` : ''}
                      </span>
                      {canEdit ? (
                        <button
                          type="button"
                          className="text-[var(--muted)] hover:text-red-300"
                          onClick={() => void removeSet(id, set.id)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">Пока нет подходов.</p>
              )}

              {canEdit ? (
                <LogSetForm
                  trainingId={id}
                  exerciseId={exercise.id}
                  nextSetNumber={exercise.sets.length + 1}
                  defaultWeight={
                    typeof exercise.metadata?.targetWeight === 'number'
                      ? exercise.metadata.targetWeight
                      : null
                  }
                />
              ) : null}
            </section>
          ))}
        </div>
      )}

      {canEdit ? (
        <AddTrainingExerciseForm
          trainingId={id}
          nextOrder={current.exercises.length}
        />
      ) : null}
    </div>
  )
}
