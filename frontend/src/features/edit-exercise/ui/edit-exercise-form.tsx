'use client'

import { FormEvent, useState } from 'react'

import {
  type MuscleGroup,
  parseMuscleGroups,
  serializeMuscleGroups,
} from '@/entities/exercise/model/muscle-groups'
import { MuscleGroupPicker } from '@/entities/exercise/ui/muscle-group-picker'
import { useExerciseStore } from '@/entities/exercise/model/store'
import type { Exercise } from '@/entities/exercise/model/types'
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

      <MuscleGroupPicker value={muscleGroups} onChange={setMuscleGroups} />

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
