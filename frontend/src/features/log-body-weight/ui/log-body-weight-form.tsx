'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'

import { useBodyMeasurementStore } from '@/entities/body-measurement/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  onLogged?: () => void
}

export function LogBodyWeightForm({ onLogged }: Props) {
  const create = useBodyMeasurementStore((s) => s.create)
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const value = Number(weight)
    if (!Number.isFinite(value) || value < 20 || value > 500) {
      setError('Укажи вес от 20 до 500 кг')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await create(value)
      setWeight('')
      onLogged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-xs text-[var(--muted)]">
        Вес (кг)
        <Input
          type="number"
          step="0.1"
          min="20"
          max="500"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-28"
          placeholder="78.5"
        />
      </label>
      <Button type="submit" disabled={saving} className="h-[42px]">
        <Plus className="size-4" />
        Записать
      </Button>
      {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
    </form>
  )
}
