'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BadgeCheck } from 'lucide-react'

import { catalogApi } from '@/entities/catalog/api/catalog-api'
import type { CatalogProgramListItem } from '@/entities/catalog/model/types'
import { useProgramStore } from '@/entities/program/model/store'
import { CreateProgramForm } from '@/features/create-program/ui/create-program-form'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { Select } from '@/shared/ui/select'
import { ListSkeleton } from '@/shared/ui/skeleton'

export function CatalogPage() {
  const router = useRouter()
  const programs = useProgramStore((s) => s.items)
  const selectedId = useProgramStore((s) => s.selectedId)
  const fetchPrograms = useProgramStore((s) => s.fetchList)
  const setSelectedId = useProgramStore((s) => s.setSelectedId)
  const [items, setItems] = useState<CatalogProgramListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchPrograms()
  }, [fetchPrograms])

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

  const scheduleId =
    selectedId && programs.some((program) => program.id === selectedId)
      ? selectedId
      : (programs.find((program) => !program.isSystem) ?? programs[0])?.id ?? ''

  function selectSchedule(programId: string) {
    setSelectedId(programId)
    router.push(`/week?program=${programId}`)
  }

  return (
    <div>
      <PageHeader
        title="Программы"
        description="Выбери текущее расписание или возьми готовую неделю из каталога — план подставится в текущую неделю."
      />

      <div className="mb-8 flex max-w-xl flex-wrap items-end gap-3">
        {programs.length > 0 ? (
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Текущее расписание
            </span>
            <Select
              value={scheduleId}
              onChange={(event) => selectSchedule(event.target.value)}
              aria-label="Текущее расписание"
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.isSystem ? `${program.name} · каталог` : program.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        <CreateProgramForm
          onCreated={(program) => {
            selectSchedule(program.id)
          }}
        />
      </div>

      <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl tracking-tight">
        Каталог
      </h2>

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
                  <h3 className="font-[family-name:var(--font-display)] text-xl">{item.name}</h3>
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
