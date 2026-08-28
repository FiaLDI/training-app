'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { sourceApi } from '@/entities/source/api/source-api'
import { formatTimecodeSeconds, parseTimecodeInput } from '@/entities/source/lib/format-timecode'
import type { ExerciseTimecode } from '@/entities/source/model/types'
import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { localData } from '@/shared/lib/local-data'

type Props = {
  sourceId: string
  canEdit: boolean
}

async function loadTimecodes(sourceId: string, mode: 'local' | 'cloud') {
  if (mode === 'local') {
    return localData.timecodes.listBySource(sourceId)
  }
  return sourceApi.listTimecodes(sourceId)
}

export function SourceTimecodes({ sourceId, canEdit }: Props) {
  const mode = useSessionStore((s) => s.mode)
  const [timecodes, setTimecodes] = useState<ExerciseTimecode[]>([])
  const [timeInput, setTimeInput] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const items = await loadTimecodes(sourceId, mode === 'local' ? 'local' : 'cloud')
    setTimecodes(items)
  }

  useEffect(() => {
    void refresh().catch(() => setTimecodes([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, mode])

  async function onAdd(event: FormEvent) {
    event.preventDefault()
    const seconds = parseTimecodeInput(timeInput)
    if (seconds == null) {
      setError('Введите время в формате мм:сс или секунды')
      return
    }

    setError(null)
    try {
      if (mode === 'local') {
        localData.timecodes.create({
          sourceId,
          seconds,
          title: title || null,
        })
      } else {
        await sourceApi.createTimecode(sourceId, {
          seconds,
          title: title || null,
        })
      }
      setTimeInput('')
      setTitle('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить таймкод')
    }
  }

  async function onRemove(timecodeId: string) {
    setError(null)
    try {
      if (mode === 'local') {
        localData.timecodes.remove(timecodeId)
      } else {
        await sourceApi.removeTimecode(timecodeId)
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить таймкод')
    }
  }

  if (timecodes.length === 0 && !canEdit) return null

  return (
    <div className="mt-2 space-y-2 border-t border-[var(--border)] pt-2">
      {timecodes.length > 0 ? (
        <ul className="space-y-1">
          {timecodes.map((timecode) => (
            <li
              key={timecode.id}
              className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]"
            >
              <span>
                <span className="tabular-nums text-[var(--foreground)]">
                  {formatTimecodeSeconds(timecode.seconds)}
                </span>
                {timecode.title ? ` · ${timecode.title}` : null}
              </span>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => void onRemove(timecode.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--muted)]">Таймкодов пока нет.</p>
      )}

      {canEdit ? (
        <form onSubmit={onAdd} className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs text-[var(--muted)]">
            Время
            <Input
              value={timeInput}
              onChange={(event) => setTimeInput(event.target.value)}
              placeholder="1:30"
              className="h-9 w-24"
            />
          </label>
          <label className="min-w-0 flex-1 space-y-1 text-xs text-[var(--muted)]">
            Подпись
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Техника"
              className="h-9"
            />
          </label>
          <Button type="submit" variant="ghost" className="h-9 px-2">
            <Plus className="size-4" />
          </Button>
        </form>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  )
}
