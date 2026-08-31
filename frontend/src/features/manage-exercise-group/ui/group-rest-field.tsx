'use client'

import { FormEvent, useEffect, useState } from 'react'

import type { ExerciseGroupType } from '@/entities/template/model/types'
import { groupRestLabel } from '@/entities/session/lib/exercise-group-utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  type: ExerciseGroupType
  restSeconds: number | null
  disabled?: boolean
  onSave: (restSeconds: number | null) => Promise<void>
}

export function GroupRestField({ type, restSeconds, disabled, onSave }: Props) {
  const [value, setValue] = useState(restSeconds == null ? '' : String(restSeconds))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(restSeconds == null ? '' : String(restSeconds))
  }, [restSeconds])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (disabled) return
    setSaving(true)
    try {
      await onSave(value === '' ? null : Number(value))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
      <label className="space-y-1 text-xs text-[var(--muted)]">
        {groupRestLabel(type)}
        <Input
          type="number"
          min="0"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          className="h-11 w-24"
        />
      </label>
      <Button
        type="submit"
        variant="secondary"
        disabled={saving || disabled}
        className="h-11"
      >
        Сохранить
      </Button>
    </form>
  )
}
