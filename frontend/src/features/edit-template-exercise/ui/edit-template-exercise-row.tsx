'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Pencil, Trash2, X } from 'lucide-react'

import type { TemplateExercise } from '@/entities/template/model/types'
import { useTemplateStore } from '@/entities/template/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  templateId: string
  item: TemplateExercise
  exerciseName: string
  displayIndex: number
  canMoveUp: boolean
  canMoveDown: boolean
  neighborAboveId?: string
  neighborAboveOrder?: number
  neighborBelowId?: string
  neighborBelowOrder?: number
}

export function EditTemplateExerciseRow({
  templateId,
  item,
  exerciseName,
  displayIndex,
  canMoveUp,
  canMoveDown,
  neighborAboveId,
  neighborAboveOrder,
  neighborBelowId,
  neighborBelowOrder,
}: Props) {
  const updateExercise = useTemplateStore((s) => s.updateExercise)
  const removeExercise = useTemplateStore((s) => s.removeExercise)
  const [editing, setEditing] = useState(false)
  const [targetSets, setTargetSets] = useState(String(item.targetSets))
  const [minReps, setMinReps] = useState(item.minReps == null ? '' : String(item.minReps))
  const [maxReps, setMaxReps] = useState(item.maxReps == null ? '' : String(item.maxReps))
  const [targetWeight, setTargetWeight] = useState(
    item.targetWeight == null ? '' : String(item.targetWeight),
  )
  const [isWarmup, setIsWarmup] = useState(item.isWarmup ?? false)
  const [saving, setSaving] = useState(false)
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTargetSets(String(item.targetSets))
    setMinReps(item.minReps == null ? '' : String(item.minReps))
    setMaxReps(item.maxReps == null ? '' : String(item.maxReps))
    setTargetWeight(item.targetWeight == null ? '' : String(item.targetWeight))
    setIsWarmup(item.isWarmup ?? false)
  }, [item])

  function cancelEdit() {
    setTargetSets(String(item.targetSets))
    setMinReps(item.minReps == null ? '' : String(item.minReps))
    setMaxReps(item.maxReps == null ? '' : String(item.maxReps))
    setTargetWeight(item.targetWeight == null ? '' : String(item.targetWeight))
    setIsWarmup(item.isWarmup ?? false)
    setError(null)
    setEditing(false)
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updateExercise(templateId, item.id, {
        targetSets: Number(targetSets) || 1,
        minReps: minReps === '' ? null : Number(minReps),
        maxReps: maxReps === '' ? null : Number(maxReps),
        targetWeight: targetWeight === '' ? null : Number(targetWeight),
        isWarmup,
      })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  async function move(direction: 'up' | 'down') {
    const neighborId = direction === 'up' ? neighborAboveId : neighborBelowId
    const neighborOrder = direction === 'up' ? neighborAboveOrder : neighborBelowOrder
    if (neighborId == null || neighborOrder == null) return

    setMoving(true)
    setError(null)
    try {
      const currentOrder = item.exerciseOrder
      await updateExercise(templateId, item.id, { exerciseOrder: neighborOrder })
      await updateExercise(templateId, neighborId, { exerciseOrder: currentOrder })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось переместить')
    } finally {
      setMoving(false)
    }
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 flex-col gap-0.5">
            <button
              type="button"
              disabled={!canMoveUp || moving}
              aria-label="Выше"
              onClick={() => void move('up')}
              className="inline-flex size-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              disabled={!canMoveDown || moving}
              aria-label="Ниже"
              onClick={() => void move('down')}
              className="inline-flex size-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-[var(--foreground)]">
              {exerciseName}
              {item.isWarmup ? (
                <span className="ml-2 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sky-300">
                  Разминка
                </span>
              ) : null}
            </p>
            <p className="text-xs text-[var(--muted)]">
              #{displayIndex} · {item.targetSets} подходов
              {item.minReps != null || item.maxReps != null
                ? ` · ${item.minReps ?? '?'}–${item.maxReps ?? '?'} повт.`
                : ''}
              {item.targetWeight != null ? ` · ${item.targetWeight} кг` : ''}
            </p>
            {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
          </div>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
          </Button>
          <Button type="button" variant="ghost" onClick={() => void removeExercise(templateId, item.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li className="rounded-xl border border-[var(--accent)]/30 bg-[var(--surface)] p-4">
      <p className="mb-3 text-sm text-[var(--foreground)]">{exerciseName}</p>
      <form onSubmit={onSave} className="flex flex-wrap items-end gap-2">
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
        <Button type="submit" disabled={saving}>
          <Check className="size-4" />
          Сохранить
        </Button>
        <Button type="button" variant="ghost" onClick={cancelEdit}>
          <X className="size-4" />
        </Button>
        {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
      </form>
    </li>
  )
}
