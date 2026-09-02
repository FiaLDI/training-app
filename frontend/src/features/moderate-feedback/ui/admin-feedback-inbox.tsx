'use client'

import { useCallback, useEffect, useState } from 'react'
import { Inbox } from 'lucide-react'

import type {
  Feedback,
  FeedbackCategory,
  FeedbackInboxOrder,
  FeedbackInboxSort,
  FeedbackPriority,
  FeedbackStatus,
} from '@/entities/feedback/model/types'
import { Button } from '@/shared/ui/button'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'

import {
  deleteResolvedFeedback,
  listFeedbackInbox,
  resolveFeedback,
  updateFeedback,
} from '../model/moderate-feedback'

const PAGE_SIZE = 20

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Ошибка',
  idea: 'Идея',
  question: 'Вопрос',
  feature: 'Фича',
  ui: 'Интерфейс',
  complaint: 'Жалоба',
  other: 'Другое',
}

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'новое',
  read: 'прочитано',
  resolved: 'решено',
}

const PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  low: 'низкий',
  normal: 'обычный',
  high: 'высокий',
}

type SortOption = 'default' | 'newest' | 'oldest' | 'priority' | 'status'

function sortQuery(option: SortOption): { sort: FeedbackInboxSort; order: FeedbackInboxOrder } {
  if (option === 'newest') return { sort: 'createdAt', order: 'desc' }
  if (option === 'oldest') return { sort: 'createdAt', order: 'asc' }
  if (option === 'priority') return { sort: 'priority', order: 'asc' }
  if (option === 'status') return { sort: 'status', order: 'asc' }
  return { sort: 'default', order: 'desc' }
}

function originHint(item: Feedback): string {
  const mode = item.clientMeta.mode
  if (mode === 'local') return 'локальный режим'
  if (item.userId) return 'облако'
  return 'аноним'
}

function authorLabel(item: Feedback): string {
  if (item.clientMeta.mode === 'local' || !item.authorEmail) return 'Анонимно'
  return item.authorEmail
}

export function AdminFeedbackInbox() {
  const [items, setItems] = useState<Feedback[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<FeedbackStatus | ''>('')
  const [priority, setPriority] = useState<FeedbackPriority | ''>('')
  const [category, setCategory] = useState<FeedbackCategory | ''>('')
  const [sortOption, setSortOption] = useState<SortOption>('default')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const next = qInput.trim()
    const timer = window.setTimeout(() => {
      setQ((current) => {
        if (current !== next) setPage(1)
        return next
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [qInput])

  const refresh = useCallback(async () => {
    setError(null)
    const { sort, order } = sortQuery(sortOption)
    const result = await listFeedbackInbox({
      page,
      limit: PAGE_SIZE,
      q: q || undefined,
      status: status || undefined,
      priority: priority || undefined,
      category: category || undefined,
      sort,
      order,
    })
    const pageCount = Math.max(1, Math.ceil(result.total / result.limit) || 1)
    if (result.items.length === 0 && result.total > 0 && page > pageCount) {
      setPage(pageCount)
      return
    }
    setItems(result.items)
    setTotal(result.total)
  }, [page, q, status, priority, category, sortOption])

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

  async function runAction(id: string, action: () => Promise<unknown>, failMessage: string) {
    setBusyId(id)
    setError(null)
    try {
      await action()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : failMessage)
    } finally {
      setBusyId(null)
    }
  }

  async function onResolve(id: string) {
    await runAction(id, () => resolveFeedback(id), 'Не удалось отметить как решённое')
  }

  async function onMarkRead(id: string) {
    await runAction(id, () => updateFeedback(id, { status: 'read' }), 'Не удалось отметить как прочитанное')
  }

  async function onMarkUnread(id: string) {
    await runAction(id, () => updateFeedback(id, { status: 'new' }), 'Не удалось вернуть в непрочитанные')
  }

  async function onUnresolve(id: string) {
    await runAction(id, () => updateFeedback(id, { status: 'read' }), 'Не удалось отменить решено')
  }

  async function onPriorityChange(id: string, next: FeedbackPriority) {
    await runAction(id, () => updateFeedback(id, { priority: next }), 'Не удалось сменить приоритет')
  }

  async function onConfirmDelete() {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setBusyId(id)
    setError(null)
    try {
      await deleteResolvedFeedback(id)
      setDeleteConfirmId(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить')
    } finally {
      setBusyId(null)
    }
  }

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1)
  const hasFilters = Boolean(q || status || priority || category)
  const emptyMessage = hasFilters ? 'Ничего не найдено' : 'Сообщений пока нет.'

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <Inbox className="size-4 text-[var(--accent)]" />
        Входящие
      </div>

      <div className="mb-4 space-y-2">
        <Input
          value={qInput}
          onChange={(event) => setQInput(event.target.value)}
          placeholder="Поиск по тексту или почте"
          aria-label="Поиск"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            aria-label="Статус"
            value={status}
            onChange={(event) => resetPageAnd(setStatus)(event.target.value as FeedbackStatus | '')}
          >
            <option value="">Все статусы</option>
            <option value="new">Новое</option>
            <option value="read">Прочитано</option>
            <option value="resolved">Решено</option>
          </Select>
          <Select
            aria-label="Приоритет фильтра"
            value={priority}
            onChange={(event) => resetPageAnd(setPriority)(event.target.value as FeedbackPriority | '')}
          >
            <option value="">Все приоритеты</option>
            <option value="high">Высокий</option>
            <option value="normal">Обычный</option>
            <option value="low">Низкий</option>
          </Select>
          <Select
            aria-label="Категория"
            value={category}
            onChange={(event) => resetPageAnd(setCategory)(event.target.value as FeedbackCategory | '')}
          >
            <option value="">Все категории</option>
            {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((key) => (
              <option key={key} value={key}>
                {CATEGORY_LABELS[key]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Сортировка"
            value={sortOption}
            onChange={(event) => resetPageAnd(setSortOption)(event.target.value as SortOption)}
          >
            <option value="default">По умолчанию</option>
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
            <option value="priority">По приоритету</option>
            <option value="status">По статусу</option>
          </Select>
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}
      {loading && items.length === 0 ? <p className="text-sm text-[var(--muted)]">Загрузка…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-4">
          {items.map((item) => {
            const busy = busyId === item.id
            const itemPriority = item.priority ?? 'normal'
            return (
              <li key={item.id} className="border-t border-[var(--border)] pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-[var(--foreground)]">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                    {item.rating != null ? ` · ${item.rating}/5` : ''}
                    {` · ${STATUS_LABELS[item.status]}`}
                    {` · ${PRIORITY_LABELS[itemPriority]}`}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(item.createdAt).toLocaleString('ru-RU')}
                    {` · ${originHint(item)}`}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">От: {authorLabel(item)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">{item.message}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Select
                    aria-label="Приоритет"
                    className="w-auto py-2"
                    disabled={busy}
                    value={itemPriority}
                    onChange={(event) => {
                      const next = event.target.value as FeedbackPriority
                      if (next === itemPriority) return
                      void onPriorityChange(item.id, next)
                    }}
                  >
                    <option value="low">Низкий</option>
                    <option value="normal">Обычный</option>
                    <option value="high">Высокий</option>
                  </Select>
                  {item.status === 'new' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void onMarkRead(item.id)}
                    >
                      Прочитано
                    </Button>
                  ) : null}
                  {item.status === 'read' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void onMarkUnread(item.id)}
                    >
                      Не прочитано
                    </Button>
                  ) : null}
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
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void onUnresolve(item.id)}
                      >
                        Отменить решено
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        disabled={busy}
                        onClick={() => setDeleteConfirmId(item.id)}
                      >
                        Удалить
                      </Button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {total > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
          <p className="text-xs text-[var(--muted)]">
            Страница {page} из {pageCount}
            {` · ${total}`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Назад
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Далее
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={deleteConfirmId != null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={onConfirmDelete}
        title="Удалить решённое сообщение?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        pending={busyId != null && busyId === deleteConfirmId}
      />
    </section>
  )
}
