'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { useExerciseStore } from '@/entities/exercise/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'

type Props = {
  templateId: string
  nextOrder: number
}

export function AddTemplateExerciseForm({ templateId, nextOrder }: Props) {
  const exercises = useExerciseStore((s) => s.items)
  const fetchExercises = useExerciseStore((s) => s.fetchList)
  const addExercise = useTemplateStore((s) => s.addExercise)
  const [exerciseId, setExerciseId] = useState('')
  const [targetSets, setTargetSets] = useState('3')
  const [minReps, setMinReps] = useState('8')
  const [maxReps, setMaxReps] = useState('12')
  const [targetWeight, setTargetWeight] = useState('')
  const [isWarmup, setIsWarmup] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchExercises()
  }, [fetchExercises])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!exerciseId) return
    setSaving(true)
    setError(null)
    try {
      await addExercise(templateId, {
        exerciseId,
        exerciseOrder: nextOrder,
        targetSets: Number(targetSets) || 3,
        minReps: minReps === '' ? null : Number(minReps),
        maxReps: maxReps === '' ? null : Number(maxReps),
        targetWeight: targetWeight === '' ? null : Number(targetWeight),
        isWarmup,
      })
      setExerciseId('')
      setTargetWeight('')
      setIsWarmup(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить упражнение')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <label className="min-w-56 flex-1 space-y-1 text-xs text-[var(--muted)]">
        Упражнение
        <Select required value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
          <option value="">Выберите…</option>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1 text-xs text-[var(--muted)]">
        Подходы
        <Input
          type="number"
          min="1"
          value={targetSets}
          onChange={(e) => setTargetSets(e.target.value)}
          className="w-20"
        />
      </label>
      <label className="space-y-1 text-xs text-[var(--muted)]">
        Мин. повт.
        <Input
          type="number"
          min="0"
          value={minReps}
          onChange={(e) => setMinReps(e.target.value)}
          className="w-20"
        />
      </label>
      <label className="space-y-1 text-xs text-[var(--muted)]">
        Макс. повт.
        <Input
          type="number"
          min="0"
          value={maxReps}
          onChange={(e) => setMaxReps(e.target.value)}
          className="w-20"
        />
      </label>
      <label className="space-y-1 text-xs text-[var(--muted)]">
        Вес (кг)
        <Input
          type="number"
          min="0"
          step="0.5"
          value={targetWeight}
          onChange={(e) => setTargetWeight(e.target.value)}
          className="w-24"
        />
      </label>
      <label className="flex items-center gap-2 pb-2 text-xs text-[var(--muted)]">
        <input
          type="checkbox"
          checked={isWarmup}
          onChange={(e) => setIsWarmup(e.target.checked)}
          className="size-4 rounded border-[var(--border)]"
        />
        Разминка
      </label>
      <Button type="submit" disabled={saving || !exerciseId}>
        <Plus className="size-4" />
        Добавить
      </Button>
      {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
    </form>
  )
}
