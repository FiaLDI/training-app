'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'

import { useProgramStore } from '@/entities/program/model/store'
import type { Program } from '@/entities/program/model/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  onCreated?: (program: Program) => void
}

export function CreateProgramForm({ onCreated }: Props) {
  const create = useProgramStore((s) => s.create)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const program = await create({ name: name.trim() })
      setName('')
      setOpen(false)
      onCreated?.(program)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать расписание')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Новое расписание
      </Button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <label className="min-w-48 space-y-1 text-xs text-[var(--muted)]">
        Название
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Например, 3 дня в неделю"
          autoFocus
        />
      </label>
      <Button type="submit" disabled={saving || !name.trim()}>
        Создать
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Отмена
      </Button>
      {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
    </form>
  )
}
