'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useProgramStore } from '@/entities/program/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import type { Training } from '@/entities/training/model/types'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Select } from '@/shared/ui/select'
import { ListSkeleton } from '@/shared/ui/skeleton'

const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function sameDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b)
}

function formatDayMonth(date: Date) {
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()

  if (sameMonth) {
    return `${weekStart.getDate()}–${weekEnd.getDate()} ${weekEnd.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric',
    })}`
  }

  const startLabel = weekStart.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  const endLabel = weekEnd.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${startLabel} — ${endLabel}`
}

function weekOffsetFromCurrent(weekStart: Date) {
  const current = startOfWeekMonday(new Date())
  return Math.round((weekStart.getTime() - current.getTime()) / (7 * 24 * 60 * 60 * 1000))
}

function weekTitle(weekStart: Date) {
  const offset = weekOffsetFromCurrent(weekStart)
  if (offset === 0) return 'Текущая неделя'
  if (offset === 1) return 'Следующая неделя'
  if (offset === -1) return 'Прошлая неделя'
  if (offset > 1) return `Через ${offset} нед.`
  return `${Math.abs(offset)} нед. назад`
}

function scheduledAtNoonUtc(date: Date) {
  return `${toDateKey(date)}T12:00:00.000Z`
}

export function PlanPage() {
  const router = useRouter()
  const todayWeek = useMemo(() => startOfWeekMonday(new Date()), [])
  const [weekStart, setWeekStart] = useState(() => todayWeek)
  const trainings = useTrainingStore((s) => s.items)
  const loading = useTrainingStore((s) => s.loading)
  const fetchTrainings = useTrainingStore((s) => s.fetchList)
  const create = useTrainingStore((s) => s.create)
  const update = useTrainingStore((s) => s.update)
  const start = useTrainingStore((s) => s.start)
  const programs = useProgramStore((s) => s.items)
  const currentProgram = useProgramStore((s) => s.current)
  const fetchPrograms = useProgramStore((s) => s.fetchList)
  const fetchProgram = useProgramStore((s) => s.fetchOne)
  const createProgram = useProgramStore((s) => s.create)
  const addDay = useProgramStore((s) => s.addDay)
  const updateDay = useProgramStore((s) => s.updateDay)
  const removeDay = useProgramStore((s) => s.removeDay)
  const applyProgram = useProgramStore((s) => s.apply)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)

  const [programId, setProgramId] = useState('')
  const [savingDay, setSavingDay] = useState<number | null>(null)
  const [dayOverrides, setDayOverrides] = useState<Record<string, string>>({})
  const [dayErrors, setDayErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const appliedKey = useRef<string | null>(null)
  const ensuringProgram = useRef(false)

  const from = useMemo(() => {
    const d = new Date(weekStart)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [weekStart])

  const to = useMemo(() => {
    const d = addDays(weekStart, 7)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [weekStart])

  const isCurrentWeek = sameDay(weekStart, todayWeek)
  const offset = weekOffsetFromCurrent(weekStart)

  useEffect(() => {
    void fetchTrainings({ from, to, limit: 100 })
    void fetchPrograms()
    void fetchTemplates()
  }, [from, to, fetchTrainings, fetchPrograms, fetchTemplates])

  useEffect(() => {
    if (programs.length > 0) {
      if (!programId || !programs.some((p) => p.id === programId)) {
        setProgramId(programs[0].id)
      }
      return
    }
    if (ensuringProgram.current) return
    ensuringProgram.current = true
    void createProgram({ name: 'Моя неделя' })
      .then((program) => {
        setProgramId(program.id)
        return fetchPrograms()
      })
      .finally(() => {
        ensuringProgram.current = false
      })
  }, [programs, programId, createProgram, fetchPrograms])

  useEffect(() => {
    if (programId) void fetchProgram(programId)
  }, [programId, fetchProgram])

  useEffect(() => {
    if (!programId || !currentProgram || currentProgram.id !== programId) return
    if (currentProgram.days.length === 0) return
    const key = `${programId}:${toDateKey(weekStart)}`
    if (appliedKey.current === key) return
    appliedKey.current = key
    void applyProgram(programId, toDateKey(weekStart)).then(() =>
      fetchTrainings({ from, to, limit: 100 }),
    )
  }, [programId, currentProgram, weekStart, from, to, applyProgram, fetchTrainings])

  const days = useMemo(
    () =>
      DAY_SHORT.map((label, index) => ({
        label,
        date: addDays(weekStart, index),
        dayOfWeek: index + 1,
      })),
    [weekStart],
  )

  function goToWeek(next: Date) {
    appliedKey.current = null
    setDayOverrides({})
    setDayErrors({})
    setWeekStart(startOfWeekMonday(next))
  }

  function templateName(templateId: string | null) {
    if (!templateId) return 'Тренировка'
    return templates.find((t) => t.id === templateId)?.name ?? 'Тренировка'
  }

  function trainingLabel(training: Training) {
    return templateName(training.templateId) || training.notes || 'Тренировка'
  }

  function trainingsForDay(date: Date) {
    const key = toDateKey(date)
    return trainings.filter((t) => {
      if (t.status === 'cancelled') return false
      const when = t.scheduledAt ?? t.startedAt ?? t.createdAt
      return toDateKey(new Date(when)) === key
    })
  }

  function primaryTraining(date: Date) {
    const dayTrainings = trainingsForDay(date)
    return (
      dayTrainings.find((t) => t.status === 'in_progress') ??
      dayTrainings.find((t) => t.status === 'planned') ??
      dayTrainings.find((t) => t.status === 'finished') ??
      null
    )
  }

  /** Plan for this calendar day (week-specific), not the recurring program. */
  function weekDayTemplateId(date: Date) {
    const key = toDateKey(date)
    if (Object.prototype.hasOwnProperty.call(dayOverrides, key)) {
      return dayOverrides[key]
    }
    const dayTrainings = trainingsForDay(date)
    const editable =
      dayTrainings.find((t) => t.status === 'in_progress') ??
      dayTrainings.find((t) => t.status === 'planned') ??
      null
    return editable?.templateId ?? ''
  }

  function clearDayOverride(dateKey: string) {
    setDayOverrides((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, dateKey)) return prev
      const next = { ...prev }
      delete next[dateKey]
      return next
    })
  }

  function programDayTemplateId(dayOfWeek: number) {
    if (!currentProgram || currentProgram.id !== programId) return ''
    const primary = currentProgram.days
      .filter((d) => d.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.slotOrder - b.slotOrder)[0]
    return primary?.templateId ?? ''
  }

  function primaryProgramDay(dayOfWeek: number) {
    const program = useProgramStore.getState().current
    if (!program || program.id !== programId) return null
    return (
      program.days
        .filter((d) => d.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.slotOrder - b.slotOrder)[0] ?? null
    )
  }

  async function upsertScheduleDay(dayOfWeek: number, templateId: string) {
    if (!currentProgram || currentProgram.id !== programId) return
    const primary = currentProgram.days
      .filter((d) => d.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.slotOrder - b.slotOrder)[0]
    const extras = currentProgram.days
      .filter((d) => d.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.slotOrder - b.slotOrder)
      .slice(1)

    for (const extra of extras) {
      await removeDay(programId, extra.id)
    }

    if (!templateId) {
      if (primary) await removeDay(programId, primary.id)
      return
    }

    if (primary) {
      await updateDay(programId, primary.id, { templateId, slotOrder: 0 })
    } else {
      await addDay(programId, { dayOfWeek, slotOrder: 0, templateId })
    }
  }

  async function refreshWeekTrainings() {
    await fetchTrainings({ from, to, limit: 100 })
  }

  async function onDayPlanChange(dayOfWeek: number, date: Date, templateId: string) {
    const dateKey = toDateKey(date)
    setSavingDay(dayOfWeek)
    setDayOverrides((prev) => ({ ...prev, [dateKey]: templateId }))
    setDayErrors((prev) => {
      if (!prev[dateKey]) return prev
      const next = { ...prev }
      delete next[dateKey]
      return next
    })
    try {
      const existing = trainingsForDay(date)
      if (existing.some((t) => t.status === 'in_progress')) {
        clearDayOverride(dateKey)
        return
      }

      const planned = existing.filter((t) => t.status === 'planned')
      const matching = templateId
        ? planned.find((t) => t.templateId === templateId)
        : undefined
      const programDay = primaryProgramDay(dayOfWeek)

      for (const training of planned) {
        if (matching && training.id === matching.id) continue
        const patch: Parameters<typeof update>[1] = { status: 'cancelled' }
        // Link program day on cancel so apply will not recreate this week slot.
        if (programDay && (!training.programDayId || training.programId !== programId)) {
          patch.programId = programId
          patch.programDayId = programDay.id
        }
        await update(training.id, patch)
      }

      if (!templateId) {
        await refreshWeekTrainings()
        clearDayOverride(dateKey)
        return
      }

      if (matching) {
        if (programDay && (!matching.programDayId || matching.programId !== programId)) {
          await update(matching.id, {
            programId,
            programDayId: programDay.id,
          })
        }
        await refreshWeekTrainings()
        clearDayOverride(dateKey)
        return
      }

      await create({
        templateId,
        status: 'planned',
        scheduledAt: scheduledAtNoonUtc(date),
        programId: programDay ? programId : null,
        programDayId: programDay?.id ?? null,
      })
      await refreshWeekTrainings()
      clearDayOverride(dateKey)
    } catch (err) {
      clearDayOverride(dateKey)
      setDayErrors((prev) => ({
        ...prev,
        [dateKey]: err instanceof Error ? err.message : 'Не удалось изменить план дня',
      }))
    } finally {
      setSavingDay(null)
    }
  }

  async function saveDayToProgram(dayOfWeek: number, date: Date) {
    if (!programId) return
    setSavingDay(dayOfWeek)
    try {
      const dateKey = toDateKey(date)
      const templateId = weekDayTemplateId(date)
      await upsertScheduleDay(dayOfWeek, templateId)

      const programDay = primaryProgramDay(dayOfWeek)
      const primaryPlanned = useTrainingStore
        .getState()
        .items.filter((t) => {
          if (t.status !== 'planned') return false
          const when = t.scheduledAt ?? t.startedAt ?? t.createdAt
          return toDateKey(new Date(when)) === dateKey
        })
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]

      if (programDay && primaryPlanned) {
        await update(primaryPlanned.id, {
          programId,
          programDayId: programDay.id,
          templateId: primaryPlanned.templateId,
        })
      }
    } finally {
      setSavingDay(null)
    }
  }

  async function onStart(id: string) {
    setBusy(true)
    try {
      const training = await start(id)
      router.push(`/trainings/${training.id}`)
    } finally {
      setBusy(false)
    }
  }

  async function startTodayPlan(templateId: string) {
    setBusy(true)
    try {
      const training = await create({
        templateId,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      })
      router.push(`/trainings/${training.id}`)
    } finally {
      setBusy(false)
    }
  }

  const scheduleReady = Boolean(currentProgram && currentProgram.id === programId)

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Планирование</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
          {weekTitle(weekStart)}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{formatWeekRange(weekStart)}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          План дня действует только на эту неделю. Чтобы повторять каждую неделю — «Как каждую
          неделю» или{' '}
          <Link href={programId ? `/programs/${programId}` : '/programs'} className="text-[var(--accent)] hover:underline">
            программа
          </Link>
          .
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1">
          <button
            type="button"
            onClick={() => goToWeek(addDays(weekStart, -7))}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Предыдущая</span>
          </button>
          <button
            type="button"
            onClick={() => goToWeek(todayWeek)}
            className={cn(
              'rounded-xl px-3 py-2 text-sm transition',
              isCurrentWeek
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
            )}
          >
            Текущая
          </button>
          <button
            type="button"
            onClick={() => goToWeek(addDays(weekStart, 7))}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <span className="hidden sm:inline">Следующая</span>
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {offset !== 0 ? (
            <button
              type="button"
              onClick={() => goToWeek(todayWeek)}
              className="text-[var(--accent)] hover:underline"
            >
              Вернуться к текущей
            </button>
          ) : null}
          <Link href="/plans" className="text-[var(--muted)] hover:text-[var(--foreground)]">
            Планы
          </Link>
        </div>
      </div>

      {templates.length === 0 ? (
        <p className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          Сначала{' '}
          <Link href="/plans" className="text-[var(--accent)] hover:underline">
            создай план
          </Link>
          , затем назначь его на дни.
        </p>
      ) : null}

      {loading && trainings.length === 0 ? <ListSkeleton count={3} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {days.map(({ label, date, dayOfWeek }) => {
          const key = toDateKey(date)
          const dayTrainings = trainingsForDay(date)
          const isToday = sameDay(date, new Date())
          const selectedPlan = weekDayTemplateId(date)
          const programPlan = programDayTemplateId(dayOfWeek)
          const primary = primaryTraining(date)
          const overrideRest =
            Object.prototype.hasOwnProperty.call(dayOverrides, key) && dayOverrides[key] === ''
          const visiblePrimary =
            primary && !(overrideRest && primary.status === 'planned') ? primary : null
          const hasEditable = dayTrainings.some(
            (t) => t.status === 'planned' || t.status === 'in_progress',
          )
          const differsFromProgram =
            (hasEditable || !visiblePrimary) && selectedPlan !== programPlan
          const hasInProgress = dayTrainings.some((t) => t.status === 'in_progress')
          const isRest = !selectedPlan && !visiblePrimary
          const dayError = dayErrors[key]

          return (
            <article
              key={key}
              className={cn(
                'flex flex-col rounded-2xl border bg-[var(--surface)] p-4 transition',
                isToday
                  ? 'border-[var(--accent)]/45 bg-[var(--accent)]/5 shadow-[0_0_0_1px_rgba(163,230,53,0.12)]'
                  : 'border-[var(--border)] hover:border-[var(--border)]/80',
                isRest && !isToday && 'opacity-80',
              )}
            >
              <header className="mb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className={cn(
                        'text-[11px] font-medium uppercase tracking-[0.14em]',
                        isToday ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
                      )}
                    >
                      {label}
                      {isToday ? ' · сегодня' : ''}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-xl leading-none tracking-tight">
                      {date.getDate()}
                    </p>
                    <p className="mt-1 text-xs capitalize text-[var(--muted)]">
                      {formatDayMonth(date)}
                    </p>
                  </div>
                </div>
              </header>

              <label className="mb-1 block space-y-1.5 text-[11px] text-[var(--muted)]">
                План на день
                <Select
                  value={selectedPlan}
                  disabled={!scheduleReady || savingDay === dayOfWeek || hasInProgress}
                  onChange={(e) => void onDayPlanChange(dayOfWeek, date, e.target.value)}
                  className="w-full text-sm"
                >
                  <option value="">Отдых</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </label>

              {dayError ? <p className="mb-2 text-[11px] text-red-300">{dayError}</p> : null}

              {differsFromProgram && scheduleReady ? (
                <button
                  type="button"
                  disabled={savingDay === dayOfWeek || hasInProgress}
                  onClick={() => void saveDayToProgram(dayOfWeek, date)}
                  className="mb-3 text-left text-[11px] text-[var(--accent)] hover:underline disabled:opacity-50"
                >
                  Как каждую неделю
                </button>
              ) : (
                <div className="mb-3 h-[16px]" aria-hidden />
              )}

              <div className="mt-auto space-y-3 pt-1">
                {visiblePrimary ? (
                  <>
                    <Link
                      href={`/trainings/${visiblePrimary.id}`}
                      className="block truncate text-sm font-medium hover:text-[var(--accent)]"
                    >
                      {trainingLabel(visiblePrimary)}
                    </Link>
                    <div className="flex items-center justify-between gap-2">
                      <TrainingStatusBadge status={visiblePrimary.status} />
                      {visiblePrimary.status === 'planned' ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)]/15 px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/25 disabled:opacity-50"
                          onClick={() => void onStart(visiblePrimary.id)}
                        >
                          <Play className="size-3" />
                          Старт
                        </button>
                      ) : visiblePrimary.status === 'in_progress' ? (
                        <Link
                          href={`/trainings/${visiblePrimary.id}`}
                          className="text-xs font-medium text-[var(--accent)] hover:underline"
                        >
                          Открыть
                        </Link>
                      ) : visiblePrimary.status === 'finished' && visiblePrimary.templateId ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--border)]/40 disabled:opacity-50"
                          onClick={() => void startTodayPlan(visiblePrimary.templateId!)}
                        >
                          <Play className="size-3" />
                          Ещё раз
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : selectedPlan ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void startTodayPlan(selectedPlan)}
                  >
                    <Play className="size-4" />
                    Начать
                  </Button>
                ) : (
                  <p className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-center text-xs text-[var(--muted)]">
                    Отдых
                  </p>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
