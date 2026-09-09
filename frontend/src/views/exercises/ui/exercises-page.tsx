'use client'

import { useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'

import { CreateExerciseForm } from '@/features/create-exercise/ui/create-exercise-form'
import { filterExercisesByQuery } from '@/entities/exercise/lib/filter-exercises'
import { ExerciseCard } from '@/entities/exercise/ui/exercise-card'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { EmptyState } from '@/shared/ui/empty-state'
import { Input } from '@/shared/ui/input'
import { PageHeader } from '@/shared/ui/page-header'
import { TabPageFallback } from '@/shared/ui/tab-page-fallback'

export function ExercisesPage() {
  const items = useExerciseStore((s) => s.items)
  const loading = useExerciseStore((s) => s.loading)
  const error = useExerciseStore((s) => s.error)
  const query = useExerciseStore((s) => s.query)
  const setQuery = useExerciseStore((s) => s.setQuery)
  const fetchList = useExerciseStore((s) => s.fetchList)

  const filtered = useMemo(() => filterExercisesByQuery(items, query), [items, query])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  if (loading && items.length === 0) {
    return <TabPageFallback title="Упражнения" variant="search-grid" />
  }

  return (
    <div>
      <PageHeader
        title="Упражнения"
        description="Каталог движений для тренировок."
        action={<CreateExerciseForm onCreated={() => void fetchList()} />}
      />

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          className="pl-10"
          placeholder="Поиск упражнений…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {items.length === 0 ? (
        <EmptyState>Пока нет упражнений.</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>Ничего не найдено.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onDeleted={() => void fetchList()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
