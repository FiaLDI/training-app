'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'

import { AddTemplateExerciseForm } from '@/features/add-template-exercise/ui/add-template-exercise-form'
import { EditTemplateExerciseRow } from '@/features/edit-template-exercise/ui/edit-template-exercise-row'
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
    return <p className="text-sm text-red-300">{error ?? 'Template not found'}</p>
  }

  return (
    <div>
      <Link
        href="/templates"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Templates
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
                  window.location.href = '/templates'
                })
              }
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        }
      />

      <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl">Exercises</h2>
      {current.exercises.length === 0 ? (
        <EmptyState>No exercises in this template yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {current.exercises.map((item) => (
            <EditTemplateExerciseRow
              key={item.id}
              templateId={id}
              item={item}
              exerciseName={exerciseName(item.exerciseId)}
            />
          ))}
        </ul>
      )}

      <AddTemplateExerciseForm templateId={id} nextOrder={current.exercises.length} />
    </div>
  )
}
