'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Trash2 } from 'lucide-react'

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
  const current = useTrainingStore((s) => s.current)
  const loading = useTrainingStore((s) => s.loading)
  const error = useTrainingStore((s) => s.error)
  const fetchOne = useTrainingStore((s) => s.fetchOne)
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
    return <p className="text-sm text-red-300">{error ?? 'Training not found'}</p>
  }

  const canEdit = current.status === 'in_progress' || current.status === 'planned'

  return (
    <div>
      <Link
        href="/trainings"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Trainings
      </Link>

      <PageHeader
        title="Training session"
        description={`Started ${new Date(current.startedAt).toLocaleString()}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <TrainingStatusBadge status={current.status} />
            {canEdit ? (
              <Button type="button" onClick={() => void finish(id)}>
                <CheckCircle2 className="size-4" />
                Finish
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
        <EmptyState>Add exercises to start logging sets.</EmptyState>
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
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Target {exercise.targetSets} sets
                    {exercise.minReps != null || exercise.maxReps != null
                      ? ` · ${exercise.minReps ?? '?'}–${exercise.maxReps ?? '?'} reps`
                      : ''}
                    {typeof exercise.metadata?.targetWeight === 'number'
                      ? ` · ${exercise.metadata.targetWeight} kg`
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
                        Set {set.setNumber}
                        {set.weight != null ? ` · ${set.weight} kg` : ''}
                        {set.reps != null ? ` · ${set.reps} reps` : ''}
                        {set.rir != null ? ` · RIR ${set.rir}` : ''}
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
                <p className="mt-3 text-sm text-[var(--muted)]">No sets yet.</p>
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
