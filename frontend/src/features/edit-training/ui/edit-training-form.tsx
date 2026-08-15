'use client'

import { FormEvent, useEffect, useState } from 'react'

import { useTemplateStore } from '@/entities/template/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import type { Training } from '@/entities/training/model/types'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

type Props = {
  training: Training
  open: boolean
  onClose: () => void
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function scheduledAtFromDate(value: string): string | null {
  if (!value) return null
  return `${value}T12:00:00.000Z`
}

export function EditTrainingForm({ training, open, onClose }: Props) {
  const update = useTrainingStore((s) => s.update)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)

  const [templateId, setTemplateId] = useState(training.templateId ?? '')
  const [scheduledDate, setScheduledDate] = useState('')
  const [startedAt, setStartedAt] = useState('')
  const [finishedAt, setFinishedAt] = useState('')
  const [notes, setNotes] = useState(training.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPlanned = training.status === 'planned'
  const isFinished = training.status === 'finished'

  useEffect(() => {
    if (open) void fetchTemplates()
  }, [open, fetchTemplates])

  useEffect(() => {
    if (!open) return
    setTemplateId(training.templateId ?? '')
    setScheduledDate(training.scheduledAt ? toDateKey(new Date(training.scheduledAt)) : '')
    setStartedAt(toDatetimeLocal(training.startedAt))
    setFinishedAt(toDatetimeLocal(training.finishedAt))
    setNotes(training.notes ?? '')
    setError(null)
  }, [open, training])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const nextStartedAt = fromDatetimeLocal(startedAt)
      const nextFinishedAt = fromDatetimeLocal(finishedAt)

      if (isFinished && nextStartedAt && nextFinishedAt) {
        if (new Date(nextFinishedAt) < new Date(nextStartedAt)) {
          setError('Время завершения не может быть раньше начала')
          setSaving(false)
          return
        }
      }

      await update(training.id, {
        templateId: templateId || null,
        notes: notes.trim() || null,
        ...(isPlanned
          ? { scheduledAt: scheduledAtFromDate(scheduledDate) }
          : { startedAt: nextStartedAt }),
        ...(isFinished ? { finishedAt: nextFinishedAt } : {}),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Изменить тренировку"
      closeDisabled={saving}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" form="edit-training-form" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <form id="edit-training-form" onSubmit={onSubmit} className="space-y-3">
        <label className="block space-y-1 text-xs text-[var(--muted)]">
          План
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">Без плана</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
        </label>

        {isPlanned ? (
          <label className="block space-y-1 text-xs text-[var(--muted)]">
            Дата
            <Input
              type="date"
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </label>
        ) : (
          <label className="block space-y-1 text-xs text-[var(--muted)]">
            Начало
            <Input
              type="datetime-local"
              required
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </label>
        )}

        {isFinished ? (
          <label className="block space-y-1 text-xs text-[var(--muted)]">
            Завершение
            <Input
              type="datetime-local"
              value={finishedAt}
              onChange={(e) => setFinishedAt(e.target.value)}
            />
          </label>
        ) : null}

        <label className="block space-y-1 text-xs text-[var(--muted)]">
          Заметки
          <Textarea
            placeholder="Как прошла тренировка"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </form>
    </Modal>
  )
}
