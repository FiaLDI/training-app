'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { newsApi } from '@/entities/news/api/news-api'
import { formatNewsDate, newsLoadErrorMessage } from '@/entities/news/model/format'
import type { News } from '@/entities/news/model/types'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { DetailSkeleton } from '@/shared/ui/skeleton'

import { NewsArticleBody } from './news-article-body'

type Props = {
  slug: string
}

export function NewsDetailPage({ slug }: Props) {
  const [item, setItem] = useState<News | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setItem(null)
    void newsApi
      .getBySlug(slug)
      .then((news) => {
        if (!cancelled) setItem(news)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(newsLoadErrorMessage(err, 'Новость не найдена'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <div>
      <Link
        href="/news"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Новости
      </Link>

      {loading && !item ? (
        <DetailSkeleton />
      ) : error || !item ? (
        <EmptyState>{error ?? 'Новость не найдена'}</EmptyState>
      ) : (
        <>
          <p className="mb-2 text-sm text-[var(--muted)]">{formatNewsDate(item.publishedAt)}</p>
          <PageHeader title={item.title} description={item.excerpt} />
          <NewsArticleBody sections={item.sections} />
        </>
      )}
    </div>
  )
}
