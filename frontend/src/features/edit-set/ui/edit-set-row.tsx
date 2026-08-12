'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'

import type { TrainingSet } from '@/entities/training/model/types'
import { useTrainingStore } from '@/entities/training/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  trainingId: string
  set: TrainingSet
  canEdit: boolean
}

export function EditSetRow({ trainingId, set, canEdit }: Props) {
  const updateSet = useTrainingStore((s) => s.updateSet)
  const removeSet = useTrainingStore((s) => s.removeSet)
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(set.weight == null ? '' : String(set.weight))
  const [reps, setReps] = useState(set.reps == null ? '' : String(set.reps))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setWeight(set.weight == null ? '' : String(set.weight))
    setReps(set.reps == null ? '' : String(set.reps))
  }, [set])

  function cancelEdit() {
    setWeight(set.weight == null ? '' : String(set.weight))
    setReps(set.reps == null ? '' : String(set.reps))
    setError(null)
    setEditing(false)
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updateSet(trainingId, set.id, {
        weight: weight === '' ? null : Number(weight),
        reps: reps === '' ? null : Number(reps),
      })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return (
      <li className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
        <span>
          Подход {set.setNumber}
          {set.weight != null ? ` · ${set.weight} кг` : ''}
          {set.reps != null ? ` · ${set.reps} повт.` : ''}
        </span>
      </li>
    )
  }

  if (editing) {
    return (
      <li className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
        <form onSubmit={onSave} className="flex flex-wrap items-end gap-2">
          <span className="pb-2 text-sm text-[var(--muted)]">Подход {set.setNumber}</span>
          <label className="space-y-1 text-xs text-[var(--muted)]">
            Вес (кг)
            <Input
              type="number"
              step="0.5"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-24"
            />
          </label>
          <label className="space-y-1 text-xs text-[var(--muted)]">
            Повторений
            <Input
              type="number"
              min="0"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-20"
            />
          </label>
          <Button type="submit" disabled={saving} className="h-[42px]">
            <Check className="size-4" />
          </Button>
          <Button type="button" variant="ghost" onClick={cancelEdit} className="h-[42px]">
            <X className="size-4" />
          </Button>
          {error ? <p className="w-full text-xs text-red-300">{error}</p> : null}
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
      <span>
        Подход {set.setNumber}
        {set.weight != null ? ` · ${set.weight} кг` : ''}
        {set.reps != null ? ` · ${set.reps} повт.` : ''}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          className="text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          className="text-[var(--muted)] hover:text-red-300"
          onClick={() => void removeSet(trainingId, set.id)}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  )
}
