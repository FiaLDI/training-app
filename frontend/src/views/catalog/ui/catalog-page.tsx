'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'

import { catalogApi } from '@/entities/catalog/api/catalog-api'
import type { CatalogProgramListItem } from '@/entities/catalog/model/types'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { ListSkeleton } from '@/shared/ui/skeleton'

export function CatalogPage() {
  const [items, setItems] = useState<CatalogProgramListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void catalogApi
      .list()
      .then((result) => {
        if (!cancelled) setItems(result.items)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить каталог')
        }
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
      <PageHeader
        title="Готовые программы"
        description="Проверенные недели: Starting Strength, PPL, верх/низ и 5/3/1. Можно поставить на текущую неделю и править как своё расписание."
      />

      {loading && items.length === 0 && !error ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <EmptyState>{error}</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState>Каталог пуст.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/catalog/${item.slug}`}
                className="block h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)]/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-[family-name:var(--font-display)] text-xl">{item.name}</h2>
                  {item.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)]/15 px-2 py-0.5 text-[11px] text-[var(--accent)]">
                      <BadgeCheck className="size-3.5" />
                      Проверена
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{item.author}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{item.description}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {item.daysPerWeek} дн. в неделю
                  {item.tags.length > 0 ? ` · ${item.tags.join(' · ')}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
