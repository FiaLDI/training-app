'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'

import { useEquipmentStore } from '@/entities/equipment/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  onCreated?: () => void
}

export function CreateEquipmentForm({ onCreated }: Props) {
  const create = useEquipmentStore((s) => s.create)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await create({ name: name.trim() })
      setName('')
      setOpen(false)
      onCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Добавить
      </Button>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-md flex-wrap items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <label className="min-w-48 flex-1 space-y-1 text-xs text-[var(--muted)]">
        Название
        <Input
          required
          placeholder="Гантели, штанга…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <Button type="submit" disabled={saving || !name.trim()}>
        {saving ? 'Saving…' : 'Create'}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
    </form>
  )
}
