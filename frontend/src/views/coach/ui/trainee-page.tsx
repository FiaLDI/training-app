'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { coachApi } from '@/entities/coach/api/coach-api'
import type { CoachPerson, ListTrainingsResult } from '@/entities/coach/model/types'
import { useProgramStore } from '@/entities/program/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { Select } from '@/shared/ui/select'
import { DetailSkeleton } from '@/shared/ui/skeleton'

type Props = {
  traineeId: string
}

function currentMondayKey() {
  const date = new Date()
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + offset)
  return toDateKey(date)
}

export function TraineePage({ traineeId }: Props) {
  const programs = useProgramStore((s) => s.items)
  const fetchPrograms = useProgramStore((s) => s.fetchList)
  const [trainee, setTrainee] = useState<CoachPerson | null>(null)
  const [trainings, setTrainings] = useState<ListTrainingsResult['items']>([])
  const [programId, setProgramId] = useState('')
  const [applyWeek, setApplyWeek] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void fetchPrograms()
  }, [fetchPrograms])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([coachApi.listTrainees(), coachApi.listTrainings(traineeId)])
      .then(([people, list]) => {
        if (cancelled) return
        setTrainee(people.items.find((item) => item.id === traineeId) ?? null)
        setTrainings(list.items)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [traineeId])

  const defaultProgram = useMemo(() => programs[0]?.id ?? '', [programs])
  useEffect(() => {
    if (!programId && defaultProgram) setProgramId(defaultProgram)
  }, [defaultProgram, programId])

  async function assign(event: FormEvent) {
    event.preventDefault()
    if (!programId) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await coachApi.assignProgram({
        traineeId,
        programId,
        weekStart: applyWeek ? currentMondayKey() : undefined,
      })
      const extra = result.applied
        ? ` На эту неделю: ${result.applied.created} тренировок.`
        : ''
      const skipped =
        result.skippedExercises.length > 0
          ? ` Пропущены упражнения: ${result.skippedExercises.join(', ')}.`
          : ''
      setMessage(`Программа назначена.${extra}${skipped}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось назначить')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <DetailSkeleton />
  if (error && !trainee) return <p className="text-sm text-red-300">{error}</p>

  return (
    <div>
      <Link
        href="/coach"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Тренер
      </Link>
      <PageHeader
        title={trainee?.username ?? 'Подопечный'}
        description={trainee?.email}
      />

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {message ? <p className="mb-4 text-sm text-emerald-300">{message}</p> : null}

      <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">Назначить программу</h2>
        {programs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Сначала соберите неделю на вкладке «Неделя» или возьмите программу из каталога.
          </p>
        ) : (
          <form onSubmit={assign} className="space-y-3">
            <Select
              value={programId}
              onChange={(event) => setProgramId(event.target.value)}
              aria-label="Программа"
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={applyWeek}
                onChange={(event) => setApplyWeek(event.target.checked)}
              />
              Поставить на текущую неделю
            </label>
            <Button type="submit" disabled={busy || !programId}>
              {busy ? 'Назначаем…' : 'Назначить'}
            </Button>
          </form>
        )}
      </section>

      <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl">Тренировки</h2>
      {trainings.length === 0 ? (
        <EmptyState>Пока нет тренировок у подопечного.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {trainings.map((training) => (
            <li key={training.id}>
              <Link
                href={`/coach/trainees/${traineeId}/trainings/${training.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <span className="text-sm">
                  {training.scheduledAt
                    ? new Date(training.scheduledAt).toLocaleDateString('ru-RU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                      })
                    : 'Без даты'}
                </span>
                <TrainingStatusBadge status={training.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
