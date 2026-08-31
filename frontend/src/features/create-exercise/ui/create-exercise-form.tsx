'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'

import {
  type MuscleGroup,
  serializeMuscleGroups,
} from '@/entities/exercise/model/muscle-groups'
import { MuscleGroupPicker } from '@/entities/exercise/ui/muscle-group-picker'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

type Props = {
  onCreated?: () => void
}

export function CreateExerciseForm({ onCreated }: Props) {
  const create = useExerciseStore((s) => s.create)
  const user = useSessionStore((s) => s.user)
  const mode = useSessionStore((s) => s.mode)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await create({
        name,
        description: description || null,
        muscleGroup: serializeMuscleGroups(muscleGroups),
      })
      setName('')
      setDescription('')
      setMuscleGroups([])
      setOpen(false)
      onCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать')
    } finally {
      setSaving(false)
    }
  }

  // Local mode always; cloud needs an authenticated user.
  if (mode === 'cloud' && !user) return null

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Новое упражнение
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
          {saving ? 'Сохранение…' : 'Создать'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
