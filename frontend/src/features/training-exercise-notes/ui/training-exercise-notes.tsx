'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, StickyNote } from 'lucide-react'

import { useTrainingStore } from '@/entities/training/model/store'
import { cn } from '@/shared/lib/cn'
import { Textarea } from '@/shared/ui/textarea'

type Props = {
  trainingId: string
  exerciseRowId: string
  notes: string | null
  canEdit: boolean
  className?: string
}

export function TrainingExerciseNotes({
  trainingId,
  exerciseRowId,
  notes,
  canEdit,
  className,
}: Props) {
  const updateExercise = useTrainingStore((s) => s.updateExercise)
  const [value, setValue] = useState(notes ?? '')
  const [expanded, setExpanded] = useState(Boolean(notes))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValue(notes ?? '')
    if (notes) setExpanded(true)
  }, [notes, exerciseRowId])

  if (!canEdit && !notes) return null

  async function save(nextValue: string) {
    const normalized = nextValue.trim() || null
    if (normalized === (notes?.trim() || null)) return

    setSaving(true)
    setError(null)
    try {
      await updateExercise(trainingId, exerciseRowId, { notes: normalized })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить заметку')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={cn('mb-5', className)}>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <StickyNote className="size-3.5" />
        Заметки по технике
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {expanded ? (
        <div className="space-y-2">
          <Textarea
            value={value}
            readOnly={!canEdit}
            placeholder="Хват, высота сиденья, особенности техники…"
            className="min-h-20"
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => {
              if (canEdit) void save(value)
            }}
          />
          {saving ? <p className="text-xs text-[var(--muted)]">Сохранение…</p> : null}
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
      ) : notes ? (
        <p className="line-clamp-2 text-sm text-[var(--muted)]">{notes}</p>
      ) : null}
    </section>
  )
}
