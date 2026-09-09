'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'

import {
  MUSCLE_GROUPS,
  parseMuscleGroups,
  type MuscleGroup,
} from '@/entities/exercise/model/muscle-groups'
import { useExerciseStore } from '@/entities/exercise/model/store'
import type { Exercise } from '@/entities/exercise/model/types'
import { useTrainingStore } from '@/entities/training/model/store'
import { createLocalId } from '@/shared/lib/local-id'
import { cn } from '@/shared/lib/cn'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'

type Props = {
  open: boolean
  onClose: () => void
  trainingId: string
  nextOrder: number
  onAdded?: (exerciseRowId: string) => void
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('ru-RU')
}

function matchesQuery(exercise: Exercise, query: string) {
  if (!query) return true
  const haystack = normalize(
    [exercise.name, exercise.muscleGroup, exercise.description].filter(Boolean).join(' '),
  )
  return query.split(/\s+/).every((token) => haystack.includes(token))
}

export function AddTrainingExerciseModal({
  open,
  onClose,
  trainingId,
  nextOrder,
  onAdded,
}: Props) {
  const exercises = useExerciseStore((s) => s.items)
  const fetchExercises = useExerciseStore((s) => s.fetchList)
  const addExercise = useTrainingStore((s) => s.addExercise)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setMuscleFilter(null)
    setError(null)
    void fetchExercises()
  }, [open, fetchExercises])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const filtered = useMemo(() => {
    const q = normalize(query)
    return exercises.filter((exercise) => {
      if (!matchesQuery(exercise, q)) return false
      if (!muscleFilter) return true
      return parseMuscleGroups(exercise.muscleGroup).includes(muscleFilter)
    })
  }, [exercises, query, muscleFilter])

  async function selectExercise(exercise: Exercise) {
    if (savingId) return
    setSavingId(exercise.id)
    setError(null)
    try {
      const id = createLocalId()
      await addExercise(trainingId, {
        id,
        exerciseId: exercise.id,
        exerciseOrder: nextOrder,
        targetSets: 3,
      })
      onAdded?.(id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить упражнение')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить упражнение"
      variant="sheet"
      closeDisabled={Boolean(savingId)}
    >
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск упражнения…"
          className="h-12 pl-10"
        />
      </div>

      <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip
          label="Все"
          active={muscleFilter == null}
          onClick={() => setMuscleFilter(null)}
        />
        {MUSCLE_GROUPS.map((group) => (
          <FilterChip
            key={group}
            label={group}
            active={muscleFilter === group}
            onClick={() => setMuscleFilter((value) => (value === group ? null : group))}
          />
        ))}
      </div>

      {error ? <p className="mt-2 shrink-0 text-sm text-red-300">{error}</p> : null}

      <ul className="-mx-1 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <li className="px-3 py-10 text-center text-sm text-[var(--muted)]">
            Ничего не найдено
          </li>
        ) : (
          filtered.map((exercise) => {
            const groups = parseMuscleGroups(exercise.muscleGroup)
            const pending = savingId === exercise.id
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  disabled={Boolean(savingId)}
                  onClick={() => void selectExercise(exercise)}
                  className={cn(
                    'flex min-h-14 w-full flex-col items-start justify-center rounded-xl px-3 py-3 text-left transition',
                    'hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]',
                    pending && 'bg-[var(--accent)]/10',
                    savingId && !pending && 'opacity-50',
                  )}
                >
                  <span className="font-[family-name:var(--font-display)] text-base">
                    {exercise.name}
                  </span>
                  {groups.length > 0 ? (
                    <span className="mt-0.5 text-xs text-[var(--muted)]">
                      <span className="text-[var(--foreground)]">{groups[0]}</span>
                      {groups.length > 1 ? ` · ${groups.slice(1).join(' · ')}` : ''}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })
        )}
      </ul>
    </Modal>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-2 text-sm capitalize transition',
        active
          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]',
      )}
    >
      {label}
    </button>
  )
}
