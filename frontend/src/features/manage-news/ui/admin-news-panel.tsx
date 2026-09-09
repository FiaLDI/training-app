'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { newsApi } from '@/entities/news/api/news-api'
import { formatNewsDate } from '@/entities/news/model/format'
import type { CreateNewsInput, News, NewsListItem } from '@/entities/news/model/types'
import { Button } from '@/shared/ui/button'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { EmptyState } from '@/shared/ui/empty-state'
import { ListSkeleton } from '@/shared/ui/skeleton'

import { AdminNewsForm } from './admin-news-form'

export function AdminNewsPanel() {
  const [items, setItems] = useState<NewsListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<News | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<NewsListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await newsApi.list()
      setItems(result.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить новости')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function closeForm() {
    setFormMode(null)
    setEditing(null)
    setFormError(null)
  }

  async function startEdit(item: NewsListItem) {
    setFormError(null)
    try {
      const full = await newsApi.getBySlug(item.slug)
      setEditing(full)
      setFormMode('edit')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть новость')
    }
  }

  async function onSubmit(input: CreateNewsInput) {
    setSaving(true)
    setFormError(null)
    try {
      if (formMode === 'edit' && editing) {
        await newsApi.update(editing.id, input)
      } else {
        await newsApi.create(input)
      }
      closeForm()
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  async function onConfirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await newsApi.remove(pendingDelete.id)
      setPendingDelete(null)
      if (editing?.id === pendingDelete.id) closeForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">Публикации в разделе «Новости».</p>
        {formMode === null ? (
          <Button type="button" variant="secondary" onClick={() => setFormMode('create')}>
            <Plus className="size-4" />
            Новая новость
          </Button>
        ) : null}
      </div>

      {formMode === 'create' ? (
        <AdminNewsForm
          saving={saving}
          error={formError}
          onCancel={closeForm}
          onSubmit={onSubmit}
        />
      ) : null}

      {formMode === 'edit' && editing ? (
        <AdminNewsForm
          key={editing.id}
          initial={editing}
          saving={saving}
          error={formError}
          onCancel={closeForm}
          onSubmit={onSubmit}
        />
      ) : null}

      {loading && items.length === 0 && !error ? (
        <ListSkeleton count={3} />
      ) : error && items.length === 0 ? (
        <EmptyState>{error}</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState>Пока нет новостей. Создайте первую.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <div>
                <p className="text-xs text-[var(--muted)]">{formatNewsDate(item.publishedAt)}</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-lg">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{item.excerpt}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => void startEdit(item)}>
                  <Pencil className="size-4" />
                  Править
                </Button>
                <Button type="button" variant="danger" onClick={() => setPendingDelete(item)}>
                  <Trash2 className="size-4" />
                  Удалить
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && items.length > 0 ? <p className="text-sm text-red-300">{error}</p> : null}

      <ConfirmModal
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={onConfirmDelete}
        title={pendingDelete ? `Удалить «${pendingDelete.title}»?` : 'Удалить новость?'}
        description="Новость исчезнет из ленты у всех пользователей."
        confirmLabel="Удалить"
        confirmVariant="danger"
        pending={deleting}
      />
    </div>
  )
}
