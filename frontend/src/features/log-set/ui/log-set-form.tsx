'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'

import { usePreferencesStore } from '@/entities/preferences/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { NumberStepper } from '@/shared/ui/number-stepper'

type Props = {
  trainingId: string
  exerciseId: string
  nextSetNumber: number
  defaultWeight?: number | null
  onLogged?: (info: { isWarmup: boolean }) => void
}

export function LogSetForm({
  trainingId,
  exerciseId,
  nextSetNumber,
  defaultWeight,
  onLogged,
}: Props) {
  const addSet = useTrainingStore((s) => s.addSet)
  const weightStep = usePreferencesStore((s) => s.weightStep)
  const repsStep = usePreferencesStore((s) => s.repsStep)
  const [weight, setWeight] = useState(
    defaultWeight == null ? '' : String(defaultWeight),
  )
  const [reps, setReps] = useState('')
  const [isWarmup, setIsWarmup] = useState(false)
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
        isWarmup,
      })
      setWeight(weight)
      setReps('')
      setIsWarmup(false)
      onLogged?.({ isWarmup })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записать подход')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5 text-xs text-[var(--muted)]">
          Вес (кг)
          <NumberStepper
            value={weight}
            onChange={setWeight}
            step={weightStep}
            inputMode="decimal"
            ariaLabel="Вес"
          />
        </div>
        <div className="space-y-1.5 text-xs text-[var(--muted)]">
          Повторения
          <NumberStepper
            value={reps}
            onChange={setReps}
            step={repsStep}
            inputMode="numeric"
            ariaLabel="Повторения"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsWarmup((value) => !value)}
          className={cn(
            'inline-flex min-h-12 items-center justify-center rounded-xl border px-4 text-sm transition',
            isWarmup
              ? 'border-sky-500/40 bg-sky-500/15 text-sky-200'
              : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]',
          )}
        >
          Разминка
        </button>
        <Button type="submit" disabled={saving} className="h-12 min-h-12 flex-1 text-base">
          <Plus className="size-5" />
          Добавить подход
        </Button>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </form>
  )
}
