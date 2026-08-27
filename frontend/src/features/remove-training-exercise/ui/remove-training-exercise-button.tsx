'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

import { useTrainingStore } from '@/entities/training/model/store'
import { Button } from '@/shared/ui/button'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { cn } from '@/shared/lib/cn'

type Props = {
  trainingId: string
  exerciseRowId: string
  exerciseName: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  className?: string
  iconOnly?: boolean
}

export function RemoveTrainingExerciseButton({
  trainingId,
  exerciseRowId,
  exerciseName,
  variant = 'ghost',
  className,
  iconOnly = false,
}: Props) {
  const removeExercise = useTrainingStore((s) => s.removeExercise)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirmRemove() {
    if (pending) return

    setPending(true)
    setError(null)
    try {
      await removeExercise(trainingId, exerciseRowId)
      setConfirmOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось убрать')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn(!iconOnly && 'space-y-1', className)}>
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        className={iconOnly ? 'px-2' : undefined}
        title="Убрать из тренировки"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-4" />
        {!iconOnly ? 'Убрать' : null}
      </Button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirmRemove}
        title={`Убрать «${exerciseName}» из тренировки?`}
        description="Записанные подходы тоже исчезнут."
        confirmLabel="Убрать"
        confirmVariant="danger"
        pending={pending}
      />
    </div>
  )
}
