'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'

import { buildTemplateSessionItems } from '@/entities/session/lib/build-session-items'
import { resolveLinkWithBelowAction } from '@/entities/session/lib/exercise-group-utils'
import { AddTemplateExerciseForm } from '@/features/add-template-exercise/ui/add-template-exercise-form'
import { EditTemplateExerciseRow } from '@/features/edit-template-exercise/ui/edit-template-exercise-row'
import { TemplateExerciseGroupCard } from '@/features/manage-exercise-group/ui/template-exercise-group-card'
import { StartTrainingButton } from '@/features/start-training/ui/start-training-button'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { DetailSkeleton } from '@/shared/ui/skeleton'

type Props = {
  id: string
}

export function TemplateDetailPage({ id }: Props) {
  const current = useTemplateStore((s) => s.current)
  const loading = useTemplateStore((s) => s.loading)
  const error = useTemplateStore((s) => s.error)
  const fetchOne = useTemplateStore((s) => s.fetchOne)
  const remove = useTemplateStore((s) => s.remove)
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
    return <p className="text-sm text-red-300">{error ?? 'План не найден'}</p>
  }

  const sortedExercises = [...current.exercises].sort(
    (a, b) => a.exerciseOrder - b.exerciseOrder,
  )
  const sessionItems = buildTemplateSessionItems(sortedExercises, current.groups ?? [])

  return (
    <div>
      <Link
        href="/plans"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Планы
      </Link>

      <PageHeader
        title={current.name}
        description={current.description ?? undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <StartTrainingButton templateId={current.id} />
            <Button
              variant="danger"
              type="button"
              onClick={() =>
                void remove(id).then(() => {
                  window.location.href = '/plans'
                })
              }
            >
              <Trash2 className="size-4" />
              Удалить
            </Button>
          </div>
        }
      />

      <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl">Упражнения</h2>
      {sortedExercises.length === 0 ? (
        <EmptyState>В этом плане пока нет упражнений.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {sessionItems.map((sessionItem) => {
            if (sessionItem.kind === 'group') {
              return (
                <TemplateExerciseGroupCard
                  key={sessionItem.group.id}
                  templateId={id}
                  group={sessionItem.group}
                  exercises={sessionItem.exercises}
                  exerciseName={exerciseName}
                  allExercises={sortedExercises}
                />
              )
            }

            const item = sessionItem.exercise
            const index = sortedExercises.findIndex((row) => row.id === item.id)
            const above = sortedExercises[index - 1]
            const below = sortedExercises[index + 1]
            const linkAction = resolveLinkWithBelowAction(item, below, sortedExercises)

            return (
              <EditTemplateExerciseRow
                key={item.id}
                templateId={id}
                item={item}
                exerciseName={exerciseName(item.exerciseId)}
                displayIndex={index + 1}
                canMoveUp={index > 0}
                canMoveDown={index < sortedExercises.length - 1}
                neighborAboveId={above?.id}
                neighborAboveOrder={above?.exerciseOrder}
                neighborBelowId={below?.id}
                neighborBelowOrder={below?.exerciseOrder}
                canLinkWithBelow={linkAction != null}
                linkAction={linkAction}
              />
            )
          })}
        </ul>
      )}

      <AddTemplateExerciseForm
        templateId={id}
        nextOrder={
          current.exercises.reduce((max, item) => Math.max(max, item.exerciseOrder), -1) + 1
        }
      />
    </div>
  )
}
