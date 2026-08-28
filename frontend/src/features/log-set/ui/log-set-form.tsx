'use client'

import { FormEvent, useState } from 'react'
import { Plus, TrendingDown } from 'lucide-react'

import { usePreferencesStore } from '@/entities/preferences/model/store'
import {
  lastLoggableSet,
  nextDropMetadata,
  suggestDropWeight,
} from '@/entities/training/lib/drop-set'
import type { TrainingSet } from '@/entities/training/model/types'
import { useTrainingStore } from '@/entities/training/model/store'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { NumberStepper } from '@/shared/ui/number-stepper'

type Props = {
  trainingId: string
  exerciseId: string
  nextSetNumber: number
  defaultWeight?: number | null
  sets?: TrainingSet[]
  onLogged?: (info: { isWarmup: boolean; isDrop?: boolean }) => void
}

export function LogSetForm({
  trainingId,
  exerciseId,
  nextSetNumber,
  defaultWeight,
  sets = [],
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

  const lastSet = lastLoggableSet(sets)
  const canDrop = Boolean(lastSet && !lastSet.isWarmup && !isWarmup)

  async function persistSet(metadata?: Record<string, unknown>) {
    await addSet(trainingId, exerciseId, {
      setNumber: nextSetNumber,
      weight: weight === '' ? null : Number(weight),
      reps: reps === '' ? null : Number(reps),
      completed: true,
      isWarmup,
      metadata,
    })
    setReps('')
    setIsWarmup(false)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await persistSet()
      setWeight(weight)
      onLogged?.({ isWarmup })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записать подход')
    } finally {
      setSaving(false)
    }
  }

  async function onDrop() {
    if (!canDrop) return
    const dropMetadata = nextDropMetadata(lastSet)
    if (!dropMetadata) return

    setSaving(true)
    setError(null)
    try {
      const suggested = suggestDropWeight(
        weight === '' ? lastSet?.weight : Number(weight),
        weightStep,
      )
      await persistSet(dropMetadata)
      setWeight(suggested)
      onLogged?.({ isWarmup: false, isDrop: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записать дроп')
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
        {canDrop ? (
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => void onDrop()}
            className="h-12 min-h-12"
          >
            <TrendingDown className="size-5" />
            Дроп
          </Button>
        ) : null}
        <Button type="submit" disabled={saving} className="h-12 min-h-12 flex-1 text-base">
          <Plus className="size-5" />
          Добавить подход
        </Button>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </form>
  )
}
