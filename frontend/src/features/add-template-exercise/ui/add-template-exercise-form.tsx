'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { ExerciseCombobox } from '@/entities/exercise/ui/exercise-combobox'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

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
      })
      setExerciseId('')
      setTargetWeight('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить упражнение')
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = Boolean(exerciseId) && !saving

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
    >
      <div className="space-y-1.5">
        <h3 className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--foreground)]">
          Добавить упражнение
        </h3>
        <ExerciseCombobox
          exercises={exercises}
          value={exerciseId}
          onChange={setExerciseId}
          placeholder="Найти упражнение…"
        />
      </div>

      <div
        className={cn(
          'grid gap-3 transition',
          exerciseId ? 'opacity-100' : 'opacity-60',
        )}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 text-xs text-[var(--muted)]">
            Подходы
            <Input
              type="number"
              min="1"
              value={targetSets}
              onChange={(e) => setTargetSets(e.target.value)}
              inputMode="numeric"
            />
          </label>

          <div className="space-y-1.5 text-xs text-[var(--muted)]">
            Повторы
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min="0"
                value={minReps}
                onChange={(e) => setMinReps(e.target.value)}
                inputMode="numeric"
                aria-label="Минимум повторений"
                className="min-w-0"
              />
              <span className="shrink-0 text-[var(--muted)]" aria-hidden>
                –
              </span>
              <Input
                type="number"
                min="0"
                value={maxReps}
                onChange={(e) => setMaxReps(e.target.value)}
                inputMode="numeric"
                aria-label="Максимум повторений"
                className="min-w-0"
              />
            </div>
          </div>

          <label className="col-span-2 space-y-1.5 text-xs text-[var(--muted)] sm:col-span-1">
            Вес, кг
            <Input
              type="number"
              min="0"
              step="0.5"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              inputMode="decimal"
              placeholder="необязательно"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            {exerciseId
              ? 'Параметры можно потом поправить в списке'
              : 'Сначала выбери упражнение'}
          </p>
        )}
        <Button type="submit" disabled={!canSubmit} className="sm:min-w-40">
          <Plus className="size-4" />
          {saving ? 'Добавление…' : 'Добавить'}
        </Button>
      </div>
    </form>
  )
}
