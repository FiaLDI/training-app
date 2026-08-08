'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'

import { useTrainingStore } from '@/entities/training/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  trainingId: string
  exerciseId: string
  nextSetNumber: number
  defaultWeight?: number | null
}

export function LogSetForm({
  trainingId,
  exerciseId,
  nextSetNumber,
  defaultWeight,
}: Props) {
  const addSet = useTrainingStore((s) => s.addSet)
  const [weight, setWeight] = useState(
    defaultWeight == null ? '' : String(defaultWeight),
  )
  const [reps, setReps] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await addSet(trainingId, exerciseId, {
        setNumber: nextSetNumber,
        weight: weight === '' ? null : Number(weight),
        reps: reps === '' ? null : Number(reps),
        completed: true,
      })
      setWeight(defaultWeight == null ? '' : String(defaultWeight))
      setReps('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записать подход')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-end gap-2">
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
        Повторений (раз)
        <Input
          type="number"
          min="0"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-20"
        />
      </label>
      <Button type="submit" disabled={saving} className="h-[42px]">
        <Plus className="size-4" />
        Подход {nextSetNumber}
      </Button>
      {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
    </form>
  )
}
