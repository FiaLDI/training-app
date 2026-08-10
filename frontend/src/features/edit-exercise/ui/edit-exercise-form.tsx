'use client'

import { FormEvent, useState } from 'react'

import {
  MUSCLE_GROUPS,
  type MuscleGroup,
  parseMuscleGroups,
  serializeMuscleGroups,
} from '@/entities/exercise/model/muscle-groups'
import { useExerciseStore } from '@/entities/exercise/model/store'
import type { Exercise } from '@/entities/exercise/model/types'
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

  const [name, setName] = useState(exercise.name)
  const [description, setDescription] = useState(exercise.description ?? '')
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(
    parseMuscleGroups(exercise.muscleGroup),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleMuscleGroup(group: MuscleGroup) {
    setMuscleGroups((current) =>
      current.includes(group)
        ? current.filter((item) => item !== group)
        : [...current, group],
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
      })
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
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
        placeholder="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Textarea
        placeholder="Описание"
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

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
