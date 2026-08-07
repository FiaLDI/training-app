'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import {
  MUSCLE_GROUPS,
  type MuscleGroup,
  serializeMuscleGroups,
} from '@/entities/exercise/model/muscle-groups'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useEquipmentStore } from '@/entities/equipment/model/store'
import { serializeEquipmentNames } from '@/entities/equipment/model/types'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

type Props = {
  onCreated?: () => void
}

export function CreateExerciseForm({ onCreated }: Props) {
  const create = useExerciseStore((s) => s.create)
  const equipmentItems = useEquipmentStore((s) => s.items)
  const fetchEquipment = useEquipmentStore((s) => s.fetchList)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      void fetchEquipment()
    }
  }, [open, fetchEquipment])

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
      await create({
        name,
        description: description || null,
        muscleGroup: serializeMuscleGroups(muscleGroups),
        equipment: serializeEquipmentNames(selectedEquipment),
      })
      setName('')
      setDescription('')
      setMuscleGroups([])
      setSelectedEquipment([])
      setOpen(false)
      onCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New exercise
      </Button>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
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
          {saving ? 'Saving…' : 'Create'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
