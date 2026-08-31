'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Link2,
  Link2Off,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'

import {
  groupRestLabel,
  type LinkWithBelowAction,
} from '@/entities/session/lib/exercise-group-utils'
import type { ExerciseGroupType } from '@/entities/template/model/types'
import type { TrainingExercise, TrainingSet } from '@/entities/training/model/types'
import { useTrainingStore } from '@/entities/training/model/store'
import { DropdownItem, DropdownMenu } from '@/shared/ui/dropdown-menu'
import { Button } from '@/shared/ui/button'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { Input } from '@/shared/ui/input'

type Props = {
  trainingId: string
  item: TrainingExercise & { sets: TrainingSet[] }
  exerciseName: string
  canEdit: boolean
  canRemove: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  neighborAboveId?: string
  neighborAboveOrder?: number
  neighborBelowId?: string
  neighborBelowOrder?: number
  canLinkWithBelow?: boolean
  groupId?: string | null
  groupType?: ExerciseGroupType
  groupRestSeconds?: number | null
  linkAction?: LinkWithBelowAction
}

function targetWeightFrom(item: TrainingExercise) {
  const value = item.metadata?.targetWeight
  return typeof value === 'number' ? value : null
}

function ExerciseMeta({
  item,
  groupType,
  groupRestSeconds,
}: {
  item: TrainingExercise
  groupType?: ExerciseGroupType
  groupRestSeconds?: number | null
}) {
  const targetWeight = targetWeightFrom(item)
  const parts = [`${item.targetSets} подх.`]
  if (item.minReps != null || item.maxReps != null) {
    parts.push(`${item.minReps ?? '?'}–${item.maxReps ?? '?'} повт.`)
  }
  if (targetWeight != null) parts.push(`${targetWeight} кг`)
  if (groupType && groupRestSeconds != null) {
    parts.push(`${groupRestLabel(groupType).replace(' (с)', '')} ${groupRestSeconds}с`)
  } else if (item.restSeconds != null) {
    parts.push(`отдых ${item.restSeconds}с`)
  }

  return <p className="text-sm text-[var(--muted)]">{parts.join(' · ')}</p>
}

export function EditTrainingExerciseRow({
  trainingId,
  item,
  exerciseName,
  canEdit,
  canRemove,
  canMoveUp,
  canMoveDown,
  neighborAboveId,
  neighborAboveOrder,
  neighborBelowId,
  neighborBelowOrder,
  canLinkWithBelow = false,
  groupId = null,
  groupType,
  groupRestSeconds,
  linkAction,
}: Props) {
  const updateExercise = useTrainingStore((s) => s.updateExercise)
  const removeExercise = useTrainingStore((s) => s.removeExercise)
  const createGroup = useTrainingStore((s) => s.createGroup)
  const addExerciseToGroup = useTrainingStore((s) => s.addExerciseToGroup)
  const deleteGroup = useTrainingStore((s) => s.deleteGroup)
  const [editing, setEditing] = useState(false)
  const [targetSets, setTargetSets] = useState(String(item.targetSets))
  const [minReps, setMinReps] = useState(item.minReps == null ? '' : String(item.minReps))
  const [maxReps, setMaxReps] = useState(item.maxReps == null ? '' : String(item.maxReps))
  const [targetWeight, setTargetWeight] = useState(() => {
    const value = targetWeightFrom(item)
    return value == null ? '' : String(value)
  })
  const [restSeconds, setRestSeconds] = useState(
    item.restSeconds == null ? '' : String(item.restSeconds),
  )
  const [saving, setSaving] = useState(false)
  const [moving, setMoving] = useState(false)
  const [linking, setLinking] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTargetSets(String(item.targetSets))
    setMinReps(item.minReps == null ? '' : String(item.minReps))
    setMaxReps(item.maxReps == null ? '' : String(item.maxReps))
    const weight = targetWeightFrom(item)
    setTargetWeight(weight == null ? '' : String(weight))
    setRestSeconds(item.restSeconds == null ? '' : String(item.restSeconds))
  }, [item])

  function cancelEdit() {
    setTargetSets(String(item.targetSets))
    setMinReps(item.minReps == null ? '' : String(item.minReps))
    setMaxReps(item.maxReps == null ? '' : String(item.maxReps))
    const weight = targetWeightFrom(item)
    setTargetWeight(weight == null ? '' : String(weight))
    setRestSeconds(item.restSeconds == null ? '' : String(item.restSeconds))
    setError(null)
    setEditing(false)
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updateExercise(trainingId, item.id, {
        targetSets: Number(targetSets) || 1,
        minReps: minReps === '' ? null : Number(minReps),
        maxReps: maxReps === '' ? null : Number(maxReps),
        targetWeight: targetWeight === '' ? null : Number(targetWeight),
        restSeconds: restSeconds === '' ? null : Number(restSeconds),
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
      await updateExercise(trainingId, item.id, { exerciseOrder: neighborOrder })
      await updateExercise(trainingId, neighborId, { exerciseOrder: currentOrder })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось переместить')
    } finally {
      setMoving(false)
    }
  }

  async function linkWithBelow() {
    if (!linkAction) return
    setLinking(true)
    setError(null)
    try {
      if (linkAction.kind === 'create') {
        await createGroup(trainingId, {
          exerciseIds: linkAction.exerciseIds,
        })
      } else {
        await addExerciseToGroup(trainingId, linkAction.groupId, linkAction.exerciseId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось объединить упражнения')
    } finally {
      setLinking(false)
    }
  }

  async function ungroup() {
    if (!groupId) return
    setLinking(true)
    setError(null)
    try {
      await deleteGroup(trainingId, groupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось разъединить')
    } finally {
      setLinking(false)
    }
  }

  async function onConfirmRemove() {
    if (removing) return

    setRemoving(true)
    setError(null)
    try {
      await removeExercise(trainingId, item.id)
      setRemoveConfirmOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось убрать')
    } finally {
      setRemoving(false)
    }
  }

  const hasMenu = canEdit || canRemove

  if (editing && canEdit) {
    return (
      <form onSubmit={onSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="space-y-1 text-xs text-[var(--muted)]">
            Подходы
            <Input
              type="number"
              min="1"
              inputMode="numeric"
              value={targetSets}
              onChange={(e) => setTargetSets(e.target.value)}
              className="h-11"
            />
          </label>
          <label className="space-y-1 text-xs text-[var(--muted)]">
            Мин. повт.
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              value={minReps}
              onChange={(e) => setMinReps(e.target.value)}
              className="h-11"
            />
          </label>
          <label className="space-y-1 text-xs text-[var(--muted)]">
            Макс. повт.
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              value={maxReps}
              onChange={(e) => setMaxReps(e.target.value)}
              className="h-11"
            />
          </label>
          <label className="space-y-1 text-xs text-[var(--muted)]">
            Вес (кг)
            <Input
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              className="h-11"
            />
          </label>
          {groupId ? null : (
            <label className="space-y-1 text-xs text-[var(--muted)]">
              Отдых (с)
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={restSeconds}
                onChange={(e) => setRestSeconds(e.target.value)}
                className="h-11"
              />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="h-11 flex-1">
            <Check className="size-4" />
            Сохранить
          </Button>
          <Button type="button" variant="ghost" onClick={cancelEdit} className="h-11 px-3">
            <X className="size-4" />
          </Button>
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </form>
    )
  }

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 pt-1.5">
        <ExerciseMeta
          item={item}
          groupType={groupType}
          groupRestSeconds={groupRestSeconds}
        />
        {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
      </div>
      {hasMenu ? (
        <DropdownMenu
          ariaLabel="Действия с упражнением"
          trigger={<MoreHorizontal className="size-5" />}
          triggerClassName="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          {(close) => (
            <>
              {canEdit ? (
                <DropdownItem
                  icon={<Pencil className="size-4" />}
                  onClick={() => {
                    close()
                    setEditing(true)
                  }}
                >
                  Изменить цель
                </DropdownItem>
              ) : null}
              {canEdit ? (
                <DropdownItem
                  icon={<ArrowUp className="size-4" />}
                  disabled={!canMoveUp || moving}
                  onClick={() => {
                    close()
                    void move('up')
                  }}
                >
                  Выше в списке
                </DropdownItem>
              ) : null}
              {canEdit ? (
                <DropdownItem
                  icon={<ArrowDown className="size-4" />}
                  disabled={!canMoveDown || moving}
                  onClick={() => {
                    close()
                    void move('down')
                  }}
                >
                  Ниже в списке
                </DropdownItem>
              ) : null}
              {canEdit && canLinkWithBelow ? (
                <DropdownItem
                  icon={<Link2 className="size-4" />}
                  disabled={linking}
                  onClick={() => {
                    close()
                    void linkWithBelow()
                  }}
                >
                  Супerset со следующим
                </DropdownItem>
              ) : null}
              {canEdit && groupId ? (
                <DropdownItem
                  icon={<Link2Off className="size-4" />}
                  disabled={linking}
                  onClick={() => {
                    close()
                    void ungroup()
                  }}
                >
                  Разъединить супerset
                </DropdownItem>
              ) : null}
              {canRemove ? (
                <DropdownItem
                  icon={<Trash2 className="size-4" />}
                  danger
                  onClick={() => {
                    close()
                    setRemoveConfirmOpen(true)
                  }}
                >
                  Убрать упражнение
                </DropdownItem>
              ) : null}
            </>
          )}
        </DropdownMenu>
      ) : null}

      <ConfirmModal
        open={removeConfirmOpen}
        onClose={() => setRemoveConfirmOpen(false)}
        onConfirm={onConfirmRemove}
        title={`Убрать «${exerciseName}» из тренировки?`}
        description="Записанные подходы тоже исчезнут."
        confirmLabel="Убрать"
        confirmVariant="danger"
        pending={removing}
      />
    </div>
  )
}
