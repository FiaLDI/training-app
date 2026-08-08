'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useTemplateStore } from '@/entities/template/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

export function CreateTemplateForm() {
  const create = useTemplateStore((s) => s.create)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const template = await create({
        name,
        description: description || null,
      })
      router.push(`/plans/${template.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать')
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Новый план
      </Button>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <Input required placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
      <Textarea
        placeholder="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
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
