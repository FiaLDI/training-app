'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'

import {
  MUSCLE_GROUPS,
  type MuscleGroup,
  serializeMuscleGroups,
} from '@/entities/exercise/model/muscle-groups'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { isAdmin } from '@/entities/session/model/is-admin'
import { useSessionStore } from '@/entities/session/model/store'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

type Props = {
  onCreated?: () => void
}

export function CreateExerciseForm({ onCreated }: Props) {
  const create = useExerciseStore((s) => s.create)
  const user = useSessionStore((s) => s.user)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
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

  if (!isAdmin(user)) return null

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
          {saving ? 'Сохранение…' : 'Создать'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
