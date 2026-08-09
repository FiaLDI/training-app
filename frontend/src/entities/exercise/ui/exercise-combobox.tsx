'use client'

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { ChevronsUpDown, Search, X } from 'lucide-react'

import type { Exercise } from '@/entities/exercise/model/types'
import { cn } from '@/shared/lib/cn'
import { Input } from '@/shared/ui/input'

type Props = {
  exercises: Exercise[]
  value: string
  onChange: (exerciseId: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  emptyLabel?: string
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('ru-RU')
}

function matchesQuery(exercise: Exercise, query: string) {
  if (!query) return true
  const haystack = normalize(
    [exercise.name, exercise.muscleGroup, exercise.equipment, exercise.description]
      .filter(Boolean)
      .join(' '),
  )
  return query.split(/\s+/).every((token) => haystack.includes(token))
}

export function ExerciseCombobox({
  exercises,
  value,
  onChange,
  placeholder = 'Найти упражнение…',
  disabled = false,
  className,
  emptyLabel = 'Ничего не найдено',
}: Props) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const selected = useMemo(
    () => exercises.find((exercise) => exercise.id === value) ?? null,
    [exercises, value],
  )

  const filtered = useMemo(() => {
    const q = normalize(query)
    return exercises.filter((exercise) => matchesQuery(exercise, q)).slice(0, 50)
  }, [exercises, query])

  useEffect(() => {
    if (!open) return
    setHighlight(0)
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function selectExercise(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  function clearSelection() {
    onChange('')
    setQuery('')
    setOpen(true)
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const item = filtered[highlight]
      if (item) selectExercise(item.id)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left text-sm outline-none transition',
            'hover:border-[var(--border)]/80 focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/20',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          <Search className="size-4 shrink-0 text-[var(--muted)]" />
          <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-[var(--muted)]')}>
            {selected ? selected.name : placeholder}
          </span>
          {selected ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Очистить"
              className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              onClick={(event) => {
                event.stopPropagation()
                clearSelection()
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="size-4 shrink-0 text-[var(--muted)]" />
          )}
        </button>
      ) : (
        <div className="rounded-lg border border-[var(--accent)]/40 bg-[var(--surface)] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="relative border-b border-[var(--border)]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={placeholder}
              className="border-0 bg-transparent pl-10 shadow-none focus:ring-0"
              aria-controls={listId}
              aria-expanded
              aria-autocomplete="list"
              role="combobox"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-[var(--muted)]">{emptyLabel}</li>
            ) : (
              filtered.map((exercise, index) => {
                const active = index === highlight
                const isSelected = exercise.id === value
                return (
                  <li key={exercise.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition',
                        active || isSelected
                          ? 'bg-[var(--accent)]/15 text-[var(--foreground)]'
                          : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]',
                      )}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => selectExercise(exercise.id)}
                    >
                      <span className="truncate">{exercise.name}</span>
                      {exercise.muscleGroup || exercise.equipment ? (
                        <span className="truncate text-[11px] text-[var(--muted)]">
                          {[exercise.muscleGroup, exercise.equipment].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
