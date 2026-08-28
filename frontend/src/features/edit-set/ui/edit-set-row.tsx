'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'

import { isDropSet } from '@/entities/training/lib/drop-set'
import type { TrainingSet } from '@/entities/training/model/types'
import { usePreferencesStore } from '@/entities/preferences/model/store'
import { formatKg } from '@/entities/training/lib/session-weight'
import { useTrainingStore } from '@/entities/training/model/store'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { NumberStepper } from '@/shared/ui/number-stepper'

type Props = {
  trainingId: string
  set: TrainingSet
  canEdit: boolean
}

export function EditSetRow({ trainingId, set, canEdit }: Props) {
  const updateSet = useTrainingStore((s) => s.updateSet)
  const removeSet = useTrainingStore((s) => s.removeSet)
  const weightStep = usePreferencesStore((s) => s.weightStep)
  const repsStep = usePreferencesStore((s) => s.repsStep)
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(set.weight == null ? '' : String(set.weight))
  const [reps, setReps] = useState(set.reps == null ? '' : String(set.reps))
  const [isWarmup, setIsWarmup] = useState(set.isWarmup ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setWeight(set.weight == null ? '' : String(set.weight))
    setReps(set.reps == null ? '' : String(set.reps))
    setIsWarmup(set.isWarmup ?? false)
  }, [set])

  function cancelEdit() {
    setWeight(set.weight == null ? '' : String(set.weight))
    setReps(set.reps == null ? '' : String(set.reps))
    setIsWarmup(set.isWarmup ?? false)
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
        isWarmup,
      })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  if (editing && canEdit) {
    return (
      <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
        <form onSubmit={onSave} className="space-y-3">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            Подход {set.setNumber}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 text-xs text-[var(--muted)]">
              Вес (кг)
              <NumberStepper
                value={weight}
                onChange={setWeight}
                step={weightStep}
                inputMode="decimal"
                ariaLabel="Вес"
              />
            </div>
            <div className="space-y-1 text-xs text-[var(--muted)]">
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
          <button
            type="button"
            onClick={() => setIsWarmup((value) => !value)}
            className={cn(
              'inline-flex min-h-11 items-center rounded-xl border px-3 text-sm transition',
              isWarmup
                ? 'border-sky-500/40 bg-sky-500/15 text-sky-200'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]',
            )}
          >
            Разминка
          </button>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="h-11 flex-1">
              <Check className="size-4" />
              Сохранить
            </Button>
            <Button type="button" variant="ghost" onClick={cancelEdit} className="h-11 px-3">
              <X className="size-4" />
            </Button>
            <Button
              type="button"
              variant="danger"
              className="h-11 px-3"
              aria-label="Удалить подход"
              onClick={() => void removeSet(trainingId, set.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </form>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => canEdit && setEditing(true)}
        className={cn(
          'flex w-full min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-left transition',
          set.isWarmup ? 'bg-sky-500/8' : 'bg-[var(--surface-2)]',
          canEdit && 'active:scale-[0.99] hover:bg-[var(--surface-2)]/80',
          !canEdit && 'cursor-default',
        )}
      >
        <span className="w-7 shrink-0 font-[family-name:var(--font-display)] text-lg tabular-nums text-[var(--muted)]">
          {set.setNumber}
        </span>
        <span className="min-w-0 flex-1 font-[family-name:var(--font-display)] text-xl tabular-nums tracking-tight">
          {set.weight != null ? (
            <>
              {formatKg(set.weight)}
              <span className="ml-1 text-sm font-normal text-[var(--muted)]">кг</span>
            </>
          ) : (
            <span className="text-sm text-[var(--muted)]">—</span>
          )}
        </span>
        <span className="font-[family-name:var(--font-display)] text-xl tabular-nums tracking-tight">
          {set.reps != null ? (
            <>
              <span className="mr-1 text-sm font-normal text-[var(--muted)]">×</span>
              {set.reps}
            </>
          ) : (
            <span className="text-sm text-[var(--muted)]">—</span>
          )}
        </span>
        {set.isWarmup ? (
          <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sky-300">
            разм.
          </span>
        ) : null}
        {isDropSet(set.metadata) ? (
          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
            дроп
          </span>
        ) : null}
      </button>
    </li>
  )
}
