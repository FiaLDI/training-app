'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

import { useExerciseStore } from '@/entities/exercise/model/store'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'

type Props = {
  exerciseId: string
  exerciseName: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  className?: string
  iconOnly?: boolean
  onDeleted?: () => void
}

export function DeleteExerciseButton({
  exerciseId,
  exerciseName,
  variant = 'danger',
  className,
  iconOnly = false,
  onDeleted,
}: Props) {
  const remove = useExerciseStore((s) => s.remove)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete() {
    const ok = window.confirm(
      `Удалить упражнение «${exerciseName}»? Оно исчезнет из библиотеки на этом устройстве.`,
    )
    if (!ok) return

    setPending(true)
    setError(null)
    try {
      await remove(exerciseId)
      onDeleted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить')
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
        title="Удалить упражнение"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void onDelete()
        }}
      >
        <Trash2 className="size-4" />
        {!iconOnly ? 'Удалить' : null}
      </Button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  )
}
