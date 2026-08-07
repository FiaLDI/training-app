'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'

import {
  MUSCLE_GROUPS,
  type MuscleGroup,
  parseMuscleGroups,
  serializeMuscleGroups,
} from '@/entities/exercise/model/muscle-groups'
import { useExerciseStore } from '@/entities/exercise/model/store'
import type { Exercise } from '@/entities/exercise/model/types'
import {
  parseEquipmentNames,
  serializeEquipmentNames,
} from '@/entities/equipment/model/types'
import { useEquipmentStore } from '@/entities/equipment/model/store'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

type Props = {
  exercise: Exercise
  onCancel: () => void
  onSaved?: () => void
}

export function EditExerciseForm({ exercise, onCancel, onSaved }: Props) {
  const update = useExerciseStore((s) => s.update)
  const equipmentItems = useEquipmentStore((s) => s.items)
  const fetchEquipment = useEquipmentStore((s) => s.fetchList)

  const [name, setName] = useState(exercise.name)
  const [description, setDescription] = useState(exercise.description ?? '')
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(
    parseMuscleGroups(exercise.muscleGroup),
  )
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(
    parseEquipmentNames(exercise.equipment),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchEquipment()
  }, [fetchEquipment])

  function toggleMuscleGroup(group: MuscleGroup) {
    setMuscleGroups((current) =>
      current.includes(group)
        ? current.filter((item) => item !== group)
        : [...current, group],
    )
  }

  function toggleEquipment(equipmentName: string) {
    setSelectedEquipment((current) =>
      current.includes(equipmentName)
        ? current.filter((item) => item !== equipmentName)
        : [...current, equipmentName],
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await update(exercise.id, {
        name,
        description: description || null,
        muscleGroup: serializeMuscleGroups(muscleGroups),
        equipment: serializeEquipmentNames(selectedEquipment),
      })
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 w-full space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <Input
        required
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="space-y-2">
        <p className="text-xs text-[var(--muted)]">Группы мышц</p>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((group) => {
            const selected = muscleGroups.includes(group)
            return (
              <button
                key={group}
                type="button"
                onClick={() => toggleMuscleGroup(group)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm transition',
                  selected
                    ? 'border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]',
                )}
              >
                {group}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--muted)]">Спорт инвентарь</p>
          <Link href="/equipment" className="text-xs text-[var(--accent)] hover:underline">
            Управление
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {equipmentItems.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">
              Каталог пуст — добавь в разделе Инвентарь
            </p>
          ) : (
            equipmentItems.map((item) => {
              const selected = selectedEquipment.includes(item.name)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleEquipment(item.name)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm transition',
                    selected
                      ? 'border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent)]'
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]',
                  )}
                >
                  {item.name}
                </button>
              )
            })
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
