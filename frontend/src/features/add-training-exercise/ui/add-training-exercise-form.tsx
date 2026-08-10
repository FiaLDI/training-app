'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { ExerciseCombobox } from '@/entities/exercise/ui/exercise-combobox'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  trainingId: string
  nextOrder: number
}

export function AddTrainingExerciseForm({ trainingId, nextOrder }: Props) {
  const exercises = useExerciseStore((s) => s.items)
  const fetchExercises = useExerciseStore((s) => s.fetchList)
  const addExercise = useTrainingStore((s) => s.addExercise)
  const [exerciseId, setExerciseId] = useState('')
  const [targetSets, setTargetSets] = useState('3')
  const [isWarmup, setIsWarmup] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchExercises('')
  }, [fetchExercises])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!exerciseId) return
    setSaving(true)
    setError(null)
    try {
      await addExercise(trainingId, {
        exerciseId,
        exerciseOrder: nextOrder,
        targetSets: Number(targetSets) || 3,
        isWarmup,
      })
      setExerciseId('')
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
      <div className="min-w-56 flex-1 space-y-1 text-xs text-[var(--muted)]">
        Упражнение
        <ExerciseCombobox
          exercises={exercises}
          value={exerciseId}
          onChange={setExerciseId}
          placeholder="Найти упражнение…"
        />
      </div>
      <label className="space-y-1 text-xs text-[var(--muted)]">
        Целевые подходы
        <Input
          type="number"
          min="1"
          value={targetSets}
          onChange={(e) => setTargetSets(e.target.value)}
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
        Добавить в сессию
      </Button>
      {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
    </form>
  )
}
