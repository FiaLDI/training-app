'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

import { canEditExercise } from '@/entities/exercise/model/can-edit-exercise'
import type { Exercise } from '@/entities/exercise/model/types'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { cn } from '@/shared/lib/cn'

type Props = {
  exerciseId: string
  exerciseName: string
  /** Ownership fields for access check; omit → only admin (legacy). */
  exerciseUserId?: Exercise['userId']
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  className?: string
  iconOnly?: boolean
  onDeleted?: () => void
}

export function DeleteExerciseButton({
  exerciseId,
  exerciseName,
  exerciseUserId,
  variant = 'danger',
  className,
  iconOnly = false,
  onDeleted,
}: Props) {
  const remove = useExerciseStore((s) => s.remove)
  const user = useSessionStore((s) => s.user)
  const mode = useSessionStore((s) => s.mode)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allowed =
    mode === 'local' || canEditExercise({ userId: exerciseUserId ?? null }, user)

  async function onConfirmDelete() {
    if (pending) return

    setPending(true)
    setError(null)
    try {
      await remove(exerciseId)
      setConfirmOpen(false)
      onDeleted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить')
    } finally {
      setPending(false)
    }
  }

  if (!allowed) return null

  return (
    <div className={cn(!iconOnly && 'space-y-1', className)}>
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        className={iconOnly ? 'px-2' : undefined}
        title="Удалить упражнение"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setConfirmOpen(true)
        }}
      >
        <Trash2 className="size-4" />
        {!iconOnly ? 'Удалить' : null}
      </Button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirmDelete}
        title={`Удалить упражнение «${exerciseName}»?`}
        description="Оно исчезнет из библиотеки на этом устройстве."
        confirmLabel="Удалить"
        confirmVariant="danger"
        pending={pending}
      />
    </div>
  )
}
