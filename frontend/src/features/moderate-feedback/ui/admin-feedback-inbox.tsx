'use client'

import { useCallback, useEffect, useState } from 'react'
import { Inbox } from 'lucide-react'

import type { Feedback, FeedbackStatus } from '@/entities/feedback/model/types'
import { Button } from '@/shared/ui/button'

import {
  deleteResolvedFeedback,
  listFeedbackInbox,
  resolveFeedback,
} from '../model/moderate-feedback'

const CATEGORY_LABELS: Record<Feedback['category'], string> = {
  bug: 'Ошибка',
  idea: 'Идея',
  other: 'Другое',
}

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'новое',
  read: 'прочитано',
  resolved: 'решено',
}

function originHint(item: Feedback): string {
  const mode = item.clientMeta.mode
  if (mode === 'local') return 'локальный режим'
  if (item.userId) return 'облако'
  return 'аноним'
}

export function AdminFeedbackInbox() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    const next = await listFeedbackInbox()
    setItems(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void refresh()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить inbox')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refresh])

  async function onResolve(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await resolveFeedback(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отметить как решённое')
    } finally {
      setBusyId(null)
    }
  }

  async function onDelete(id: string) {
    const ok = window.confirm('Удалить решённое сообщение?')
    if (!ok) return
    setBusyId(id)
    setError(null)
    try {
      await deleteResolvedFeedback(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <Inbox className="size-4 text-[var(--accent)]" />
        Входящие
      </div>

      {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Загрузка…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Сообщений пока нет.</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-4">
          {items.map((item) => {
            const busy = busyId === item.id
            return (
              <li key={item.id} className="border-t border-[var(--border)] pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-[var(--foreground)]">
                    {CATEGORY_LABELS[item.category]}
                    {item.rating != null ? ` · ${item.rating}/5` : ''}
                    {` · ${STATUS_LABELS[item.status]}`}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(item.createdAt).toLocaleString('ru-RU')}
                    {` · ${originHint(item)}`}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">{item.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.status !== 'resolved' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void onResolve(item.id)}
                    >
                      Решено
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void onDelete(item.id)}
                    >
                      Удалить
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
