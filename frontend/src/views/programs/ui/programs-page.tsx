'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { CreateProgramForm } from '@/features/create-program/ui/create-program-form'
import { useProgramStore } from '@/entities/program/model/store'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { ListSkeleton } from '@/shared/ui/skeleton'

export function ProgramsPage() {
  const items = useProgramStore((s) => s.items)
  const loading = useProgramStore((s) => s.loading)
  const fetchList = useProgramStore((s) => s.fetchList)

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  return (
    <div>
      <PageHeader
        title="Программы"
        description="Раз в цикл: назначь шаблоны на дни, потом нажми «Заполнить неделю»."
        action={<CreateProgramForm />}
      />

      {loading && items.length === 0 ? (
        <ListSkeleton count={4} />
      ) : items.length === 0 ? (
        <EmptyState>Пока нет программ. Создай одну, чтобы спланировать неделю.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((program) => (
            <li key={program.id}>
              <Link
                href={`/programs/${program.id}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--accent)]/30"
              >
                <p className="font-[family-name:var(--font-display)] text-lg">{program.name}</p>
                {program.description ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">{program.description}</p>
                ) : (
                  <p className="mt-1 text-sm text-[var(--muted)]">Настроить дни недели</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
