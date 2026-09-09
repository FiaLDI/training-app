'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { newsApi } from '@/entities/news/api/news-api'
import { formatNewsDate, newsLoadErrorMessage } from '@/entities/news/model/format'
import type { NewsListItem } from '@/entities/news/model/types'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { ListSkeleton } from '@/shared/ui/skeleton'

export function NewsPage() {
  const [items, setItems] = useState<NewsListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void newsApi
      .list()
      .then((result) => {
        if (!cancelled) setItems(result.items)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(newsLoadErrorMessage(err, 'Не удалось загрузить новости'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader title="Новости" description="Что происходит на платформе" />

      {loading && items.length === 0 && !error ? (
        <ListSkeleton count={3} />
      ) : error ? (
        <EmptyState>{error}</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState>Пока нет новостей.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/news/${item.slug}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--accent)]/30"
              >
                <p className="text-xs text-[var(--muted)]">{formatNewsDate(item.publishedAt)}</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-lg">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{item.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
