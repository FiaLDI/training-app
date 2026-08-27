'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'

import { useProgramStore } from '@/entities/program/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import type { WorkoutTemplate } from '@/entities/template/model/types'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import { useTrainingStore } from '@/entities/training/model/store'
import type { TrainingStatus } from '@/entities/training/model/types'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const DAY_FULL = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]

const DOT_CLASS: Record<TrainingStatus | 'rest', string> = {
  planned: 'bg-sky-400',
  in_progress: 'bg-[var(--accent)]',
  finished: 'bg-emerald-400',
  cancelled: 'bg-transparent',
  rest: 'bg-transparent',
}

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

function weekdayIndexMonday(date: Date) {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
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

function formatDayHeading(date: Date) {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

function templateLabel(templates: WorkoutTemplate[], templateId: string | null) {
  if (!templateId) return 'Тренировка'
  return templates.find((template) => template.id === templateId)?.name ?? 'Тренировка'
}

type DayDotStatus = TrainingStatus | 'rest'

function TemplatePickerModal({
  open,
  title,
  templates,
  selectedId,
  allowRest,
  busy,
  onClose,
  onSelect,
}: {
  open: boolean
  title: string
  templates: WorkoutTemplate[]
  selectedId: string
  allowRest: boolean
  busy: boolean
  onClose: () => void
  onSelect: (templateId: string) => void
}) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ru-RU')
    if (!q) return templates
    return templates.filter((template) => {
      const haystack = [template.name, template.description].filter(Boolean).join(' ').toLocaleLowerCase('ru-RU')
      return q.split(/\s+/).every((token) => haystack.includes(token))
    })
  }, [query, templates])

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={busy}
      title={title}
      description="Выбери план тренировки на этот день."
    >
      {templates.length > 5 ? (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти план…"
            className="pl-10"
            autoComplete="off"
          />
        </div>
      ) : null}

      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {allowRest ? (
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelect('')}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition',
                selectedId === ''
                  ? 'bg-[var(--accent)]/15 text-[var(--foreground)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
              )}
            >
              <span>Отдых</span>
              {selectedId === '' ? <span className="text-xs text-[var(--accent)]">Сейчас</span> : null}
            </button>
          </li>
        ) : null}

        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">Ничего не найдено</li>
        ) : (
          filtered.map((template) => {
            const active = template.id === selectedId
            return (
              <li key={template.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSelect(template.id)}
                  className={cn(
                    'flex w-full flex-col items-start rounded-xl px-3 py-3 text-left transition',
                    active
                      ? 'bg-[var(--accent)]/15'
                      : 'hover:bg-[var(--surface-2)]',
                  )}
                >
                  <span className="text-sm font-medium text-[var(--foreground)]">{template.name}</span>
                  {template.description ? (
                    <span className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
                      {template.description}
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

function DayTrainingCard({
  title,
  status,
  href,
  subtitle,
  busy,
  onChangePlan,
  onMakeRest,
}: {
  title: string
  status: TrainingStatus
  href?: string
  subtitle?: string
  busy?: boolean
  onChangePlan?: () => void
  onMakeRest?: () => void
}) {
  const body = (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 transition',
        status === 'in_progress'
          ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10'
          : 'border-[var(--border)] bg-[var(--surface-2)]/40',
        href && 'hover:border-[var(--accent)]/30',
      )}
    >
      <div className="min-w-0">
        <p className="font-[family-name:var(--font-display)] text-lg text-[var(--foreground)]">
          {title}
        </p>
        {subtitle ? <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p> : null}
        <div className="mt-2">
          <TrainingStatusBadge status={status} />
        </div>
      </div>
      {href ? <ArrowRight className="size-4 shrink-0 text-[var(--muted)]" /> : null}
    </div>
  )

  return (
    <div className="space-y-2">
      {href ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
      {onChangePlan || onMakeRest ? (
        <div className="flex flex-wrap gap-2 px-1">
          {onChangePlan ? (
            <button
              type="button"
              disabled={busy}
              onClick={onChangePlan}
              className="text-xs text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:opacity-50"
            >
              Изменить
            </button>
          ) : null}
          {onMakeRest ? (
            <button
              type="button"
              disabled={busy}
              onClick={onMakeRest}
              className="text-xs text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:opacity-50"
            >
              Сделать отдыхом
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function WeekPage() {
  const todayWeek = useMemo(() => startOfWeekMonday(new Date()), [])
  const [weekStart, setWeekStart] = useState(() => todayWeek)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => weekdayIndexMonday(new Date()))
  const [pickerOpen, setPickerOpen] = useState(false)
  const trainings = useTrainingStore((s) => s.items)
  const loading = useTrainingStore((s) => s.loading)
  const fetchTrainings = useTrainingStore((s) => s.fetchList)
  const create = useTrainingStore((s) => s.create)
  const update = useTrainingStore((s) => s.update)
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
        fullLabel: DAY_FULL[index],
        date: addDays(weekStart, index),
        dayOfWeek: index + 1,
      })),
    [weekStart],
  )

  function goToWeek(next: Date) {
    appliedKey.current = null
    setDayOverrides({})
    setDayErrors({})
    setPickerOpen(false)
    const start = startOfWeekMonday(next)
    setWeekStart(start)
    setSelectedDayIndex(sameDay(start, todayWeek) ? weekdayIndexMonday(new Date()) : 0)
  }

  function trainingsForDay(date: Date) {
    const key = toDateKey(date)
    return trainings.filter((t) => {
      if (t.status === 'cancelled') return false
      const when = t.scheduledAt ?? t.startedAt ?? t.createdAt
      return toDateKey(new Date(when)) === key
    })
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

  function dayDotStatus(date: Date): DayDotStatus {
    const key = toDateKey(date)
    const items = trainingsForDay(date)
    if (items.some((t) => t.status === 'in_progress')) return 'in_progress'
    if (Object.prototype.hasOwnProperty.call(dayOverrides, key)) {
      if (dayOverrides[key]) return 'planned'
      if (items.some((t) => t.status === 'finished')) return 'finished'
      return 'rest'
    }
    if (items.some((t) => t.status === 'planned')) return 'planned'
    if (items.some((t) => t.status === 'finished')) return 'finished'
    return 'rest'
  }

  const scheduleReady = Boolean(currentProgram && currentProgram.id === programId)
  const selected = days[selectedDayIndex] ?? days[0]
  const selectedKey = toDateKey(selected.date)
  const selectedTrainings = trainingsForDay(selected.date)
  const selectedPlan = weekDayTemplateId(selected.date)
  const programPlan = programDayTemplateId(selected.dayOfWeek)
  const overrideRest =
    Object.prototype.hasOwnProperty.call(dayOverrides, selectedKey) && dayOverrides[selectedKey] === ''
  const inProgressItems = selectedTrainings.filter((t) => t.status === 'in_progress')
  const plannedItems = overrideRest
    ? []
    : selectedTrainings.filter((t) => t.status === 'planned')
  const finishedItems = selectedTrainings.filter((t) => t.status === 'finished')
  const hasInProgress = inProgressItems.length > 0
  const hasPlanned = plannedItems.length > 0
  const showOptimisticPlanned =
    Boolean(selectedPlan) &&
    !hasInProgress &&
    !overrideRest &&
    !plannedItems.some((t) => t.templateId === selectedPlan)
  const hasEditable = hasInProgress || hasPlanned || showOptimisticPlanned
  const isRestDay = !hasEditable && finishedItems.length === 0
  const differsFromProgram = (hasEditable || isRestDay) && selectedPlan !== programPlan
  const dayError = dayErrors[selectedKey]
  const dayBusy = savingDay === selected.dayOfWeek
  const canAssign = scheduleReady && !hasInProgress && templates.length > 0

  function pickTemplate(templateId: string) {
    setPickerOpen(false)
    void onDayPlanChange(selected.dayOfWeek, selected.date, templateId)
  }

  return (
    <div>
      <PageHeader
        title={weekTitle(weekStart)}
        description={formatWeekRange(weekStart)}
        action={
          <Link href="/plans" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            Планы
          </Link>
        }
      />

      <div className="mb-4 inline-flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1">
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

      <div
        role="tablist"
        aria-label="Дни недели"
        className="mb-5 grid grid-cols-7 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1"
      >
        {days.map((day, index) => {
          const isToday = sameDay(day.date, new Date())
          const selectedDay = index === selectedDayIndex
          const status = dayDotStatus(day.date)
          return (
            <button
              key={toDateKey(day.date)}
              type="button"
              role="tab"
              aria-selected={selectedDay}
              aria-label={`${day.fullLabel}, ${day.date.getDate()}`}
              onClick={() => {
                setSelectedDayIndex(index)
                setPickerOpen(false)
              }}
              className={cn(
                'flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 text-center transition sm:px-1',
                selectedDay
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  : isToday
                    ? 'text-[var(--accent)] hover:bg-[var(--surface-2)]'
                    : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
              )}
            >
              <span className="text-[10px] font-medium tracking-wide sm:text-xs">{day.label}</span>
              <span
                className={cn(
                  'font-[family-name:var(--font-display)] text-base leading-none sm:text-lg',
                  !selectedDay && !isToday && 'text-[var(--foreground)]',
                )}
              >
                {day.date.getDate()}
              </span>
              <span className={cn('mt-0.5 size-1.5 rounded-full', DOT_CLASS[status])} />
            </button>
          )
        })}
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

      <section
        role="tabpanel"
        className={cn(
          'rounded-2xl border px-4 py-5 sm:px-5',
          sameDay(selected.date, new Date())
            ? 'border-[var(--accent)]/45 bg-[var(--accent)]/5'
            : 'border-[var(--border)] bg-[var(--surface)]',
        )}
      >
        <header className="mb-5">
          <p
            className={cn(
              'font-[family-name:var(--font-display)] text-xl text-[var(--foreground)]',
              sameDay(selected.date, new Date()) && 'text-[var(--accent)]',
            )}
          >
            {selected.fullLabel}
            {sameDay(selected.date, new Date()) ? ' · сегодня' : ''}
          </p>
          <p className="mt-1 text-sm capitalize text-[var(--muted)]">{formatDayHeading(selected.date)}</p>
        </header>

        {loading && trainings.length === 0 ? (
          <div className="space-y-3" aria-busy="true" aria-label="Загрузка">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {inProgressItems.map((training) => (
              <DayTrainingCard
                key={training.id}
                title={templateLabel(templates, training.templateId)}
                status="in_progress"
                href={`/trainings/${training.id}`}
                subtitle="Сессия уже идёт"
              />
            ))}

            {plannedItems.map((training) => (
              <DayTrainingCard
                key={training.id}
                title={templateLabel(templates, training.templateId)}
                status="planned"
                href={`/trainings/${training.id}`}
                busy={dayBusy}
                onChangePlan={canAssign ? () => setPickerOpen(true) : undefined}
                onMakeRest={
                  canAssign
                    ? () => void onDayPlanChange(selected.dayOfWeek, selected.date, '')
                    : undefined
                }
              />
            ))}

            {showOptimisticPlanned ? (
              <DayTrainingCard
                title={templateLabel(templates, selectedPlan)}
                status="planned"
                busy={dayBusy}
              />
            ) : null}

            {finishedItems.map((training) => (
              <DayTrainingCard
                key={training.id}
                title={templateLabel(templates, training.templateId)}
                status="finished"
                href={`/trainings/${training.id}`}
                subtitle={
                  training.finishedAt
                    ? `Завершена ${new Date(training.finishedAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : undefined
                }
              />
            ))}

            {isRestDay ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-5 py-8 text-center">
                <p className="font-[family-name:var(--font-display)] text-xl text-[var(--foreground)]">
                  Отдых
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">В этот день тренировка не назначена.</p>
                {canAssign ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-5"
                    disabled={dayBusy}
                    onClick={() => setPickerOpen(true)}
                  >
                    <Plus className="size-4" />
                    Назначить тренировку
                  </Button>
                ) : null}
              </div>
            ) : null}

            {!isRestDay && !hasInProgress && !hasPlanned && !showOptimisticPlanned && canAssign ? (
              <Button
                type="button"
                variant="secondary"
                disabled={dayBusy}
                onClick={() => setPickerOpen(true)}
              >
                <Plus className="size-4" />
                Назначить тренировку
              </Button>
            ) : null}

            {dayError ? <p className="text-[11px] text-red-300">{dayError}</p> : null}

            {differsFromProgram && scheduleReady ? (
              <button
                type="button"
                disabled={dayBusy || hasInProgress}
                onClick={() => void saveDayToProgram(selected.dayOfWeek, selected.date)}
                className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50"
              >
                Как каждую неделю
              </button>
            ) : null}
          </div>
        )}
      </section>

      <TemplatePickerModal
        open={pickerOpen}
        title={hasPlanned || showOptimisticPlanned ? 'Изменить план' : 'Назначить тренировку'}
        templates={templates}
        selectedId={selectedPlan}
        allowRest={hasPlanned || showOptimisticPlanned}
        busy={dayBusy}
        onClose={() => setPickerOpen(false)}
        onSelect={pickTemplate}
      />
    </div>
  )
}
