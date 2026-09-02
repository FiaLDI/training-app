'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { MessageSquareWarning } from 'lucide-react'

import type { Feedback, FeedbackCategory } from '@/entities/feedback/model/types'
import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

import {
  flushPendingFeedback,
  listFeedbackForSettings,
  submitFeedback,
} from '../model/send-feedback'

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Ошибка',
  idea: 'Идея',
  question: 'Вопрос',
  feature: 'Фича',
  ui: 'Интерфейс',
  complaint: 'Жалоба',
  other: 'Другое',
}

function formatSyncHint(item: Feedback): string | null {
  const status = item.sync?.status
  if (status === 'pending') return 'ожидает отправки'
  if (status === 'error') return 'не удалось отправить'
  return null
}

export function SendFeedbackSection({ showHistory = true }: { showHistory?: boolean }) {
  const mode = useSessionStore((s) => s.mode)
  const [category, setCategory] = useState<FeedbackCategory>('idea')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [items, setItems] = useState<Feedback[]>([])

  const refresh = useCallback(async () => {
    if (mode !== 'local' && mode !== 'cloud') {
      setItems([])
      return
    }
    setItems(await listFeedbackForSettings(mode))
  }, [mode])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (mode !== 'local' && mode !== 'cloud') return

    const activeMode = mode
    let cancelled = false

    async function flushAndRefresh() {
      await flushPendingFeedback(activeMode)
      if (!cancelled) await refresh()
    }

    void flushAndRefresh()

    function onOnline() {
      void flushAndRefresh()
    }

    window.addEventListener('online', onOnline)
    return () => {
      cancelled = true
      window.removeEventListener('online', onOnline)
    }
  }, [mode, refresh])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode !== 'local' && mode !== 'cloud') return

    const trimmed = message.trim()
    if (!trimmed) {
      setError('Введите сообщение')
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const result = await submitFeedback({
        category,
        message: trimmed,
        rating: rating ? Number(rating) : null,
        mode,
      })
      setMessage('')
      setRating('')
      setCategory('idea')
      setNotice(
        result.status === 'sent'
          ? 'Спасибо! Фидбек отправлен.'
          : 'Сохранено локально — отправим при появлении сети.',
      )
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить')
    } finally {
      setSaving(false)
    }
  }

  if (mode !== 'local' && mode !== 'cloud') return null

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <MessageSquareWarning className="size-4 text-[var(--accent)]" />
        Обратная связь
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          aria-label="Категория"
        >
          <option value="bug">Ошибка</option>
          <option value="idea">Идея</option>
          <option value="question">Вопрос</option>
          <option value="feature">Фича</option>
          <option value="ui">Интерфейс</option>
          <option value="complaint">Жалоба</option>
          <option value="other">Другое</option>
        </Select>

        <Textarea
          required
          maxLength={2000}
          placeholder="Опишите проблему или идею"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <Select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          aria-label="Оценка"
        >
          <option value="">Оценка (необязательно)</option>
          <option value="5">5 — отлично</option>
          <option value="4">4</option>
          <option value="3">3</option>
          <option value="2">2</option>
          <option value="1">1 — плохо</option>
        </Select>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {notice ? <p className="text-sm text-[var(--accent)]">{notice}</p> : null}

        <Button type="submit" disabled={saving}>
          {saving ? 'Отправка…' : 'Отправить'}
        </Button>
      </form>

      {showHistory && items.length > 0 ? (
        <ul className="mt-5 space-y-3 border-t border-[var(--border)] pt-4">
          {items.map((item) => {
            const syncHint = formatSyncHint(item)
            return (
              <li key={item.id} className="text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-[var(--foreground)]">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                    {item.rating != null ? ` · ${item.rating}/5` : ''}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(item.createdAt).toLocaleString('ru-RU')}
                    {syncHint ? ` · ${syncHint}` : ''}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{item.message}</p>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
