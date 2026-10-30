'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Layers,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Moon,
  Search,
  Timer,
} from 'lucide-react'

import { useProgramStore } from '@/entities/program/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import type { TemplateExercise, WorkoutTemplate } from '@/entities/template/model/types'
import { ShareResourceButton } from '@/features/share-resource/ui/share-resource-button'
import { useSessionStore } from '@/entities/session/model/store'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import { useTrainingStore } from '@/entities/training/model/store'
import {
  fetchCloudSyncState,
  getSyncSnapshot,
  setVisibleTrainingWindow,
  trainingWindowNeedsFetch,
} from '@/shared/lib/cloud-sync-state'
import type { TrainingExercise, TrainingStatus } from '@/entities/training/model/types'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { cn } from '@/shared/lib/cn'
import { formatDuration, formatNumber } from '@/shared/lib/format'
import { localData } from '@/shared/lib/local-data'
import { Button } from '@/shared/ui/button'
import { DropdownItem, DropdownMenu } from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'
import { TabPageFallback } from '@/shared/ui/tab-page-fallback'

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

function pluralRu(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function targetWeightOf(exercise: TemplateExercise | TrainingExercise): number | null {
  if ('targetWeight' in exercise && typeof exercise.targetWeight === 'number') {
    return exercise.targetWeight
  }
  const raw = exercise.metadata?.targetWeight
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

function plannedVolumeKg(
  exercises: Array<TemplateExercise | TrainingExercise>,
): number | null {
  let volume = 0
  let hasWeighted = false
  for (const exercise of exercises) {
    if (exercise.isWarmup) continue
    const weight = targetWeightOf(exercise)
    const reps = exercise.maxReps ?? exercise.minReps
    if (weight == null || weight <= 0 || reps == null || reps <= 0) continue
    volume += exercise.targetSets * weight * reps
    hasWeighted = true
  }
  return hasWeighted ? Math.round(volume) : null
}

function planCardStats(templateId: string | null | undefined, trainingId?: string) {
  if (trainingId) {
    const details = localData.trainings.get(trainingId)
    if (details && details.exercises.length > 0) {
      return {
        exerciseCount: details.exercises.length,
        volumeKg: plannedVolumeKg(details.exercises),
      }
    }
  }
  if (!templateId) return { exerciseCount: null as number | null, volumeKg: null as number | null }
  const template = localData.templates.get(templateId)
  if (!template || template.exercises.length === 0) {
    return { exerciseCount: null as number | null, volumeKg: null as number | null }
  }
  return {
    exerciseCount: template.exercises.length,
    volumeKg: plannedVolumeKg(template.exercises),
  }
}

function previousPlanDurationLabel(templateId: string | null | undefined, excludeId?: string) {
  if (!templateId) return null
  const previous = localData.trainings
    .list()
    .filter(
      (item) =>
        item.templateId === templateId &&
        item.status === 'finished' &&
        item.id !== excludeId &&
        item.startedAt &&
        item.finishedAt,
    )
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))[0]
  if (!previous) return null
  const label = formatDuration(previous.startedAt, previous.finishedAt)
  return label ? `~ ${label}` : null
}

function DayTrainingCard({
  title,
  status,
  href,
  templateId,
  trainingId,
  busy,
  highlight,
  onChangePlan,
  onMakeRest,
}: {
  title: string
  status: TrainingStatus
  href?: string
  templateId?: string | null
  trainingId?: string
  busy?: boolean
  highlight?: boolean
  onChangePlan?: () => void
  onMakeRest?: () => void
}) {
  const stats = planCardStats(templateId, trainingId)
  const durationLabel =
    status === 'finished' && trainingId
      ? (() => {
          const training = localData.trainings.get(trainingId)
          return training ? formatDuration(training.startedAt, training.finishedAt) : null
        })()
      : previousPlanDurationLabel(templateId, trainingId)

  const exerciseLabel =
    stats.exerciseCount == null
      ? 'упражнений'
      : pluralRu(stats.exerciseCount, 'упражнение', 'упражнения', 'упражнений')
  const subtitleParts = [
    stats.exerciseCount != null ? `${stats.exerciseCount} ${exerciseLabel}` : null,
    durationLabel,
  ].filter(Boolean)

  const hasMenu = Boolean(onChangePlan || onMakeRest)

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-4 sm:px-5',
        status === 'in_progress'
          ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10'
          : highlight
            ? 'border-[var(--accent)]/45 bg-[var(--accent)]/5'
            : 'border-[var(--border)] bg-[var(--surface)]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)]">
          <Dumbbell className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-display)] text-lg leading-tight text-[var(--foreground)]">
            {title}
          </p>
          {subtitleParts.length > 0 ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{subtitleParts.join(' · ')}</p>
          ) : null}
        </div>
        <TrainingStatusBadge status={status} className="shrink-0 rounded-full" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[var(--surface-2)] px-2.5 py-3">
          <Layers className="mb-2 size-4 text-[var(--accent)]" />
          <p className="text-sm font-semibold tabular-nums text-[var(--foreground)] sm:text-base">
            {stats.exerciseCount ?? '—'}
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-[var(--muted)] sm:text-xs">
            {exerciseLabel}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface-2)] px-2.5 py-3">
          <Timer className="mb-2 size-4 text-[var(--accent)]" />
          <p className="text-sm font-semibold tabular-nums text-[var(--foreground)] sm:text-base">
            {durationLabel ?? '—'}
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-[var(--muted)] sm:text-xs">
            длительность
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface-2)] px-2.5 py-3">
          <ChartNoAxesColumn className="mb-2 size-4 text-[var(--accent)]" />
          <p className="text-sm font-semibold tabular-nums text-[var(--foreground)] sm:text-base">
            {stats.volumeKg == null ? '—' : `${formatNumber(stats.volumeKg)} кг`}
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-[var(--muted)] sm:text-xs">
            план. объём
          </p>
        </div>
      </div>

      {status === 'planned' && (href || hasMenu) ? (
        <div className="mt-4 flex items-center gap-2">
          {href ? (
            <Link
              href={href}
              className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-medium text-[var(--accent-fg)] transition hover:brightness-110"
            >
              <Play className="size-4 fill-current" />
              Начать тренировку
            </Link>
          ) : null}
          {hasMenu ? (
            <DropdownMenu
              ariaLabel="Действия с тренировкой"
              align="right"
              trigger={<MoreHorizontal className="size-5" />}
              triggerClassName="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {(close) => (
                <>
                  {onChangePlan ? (
                    <DropdownItem
                      icon={<Pencil className="size-4" />}
                      disabled={busy}
                      onClick={() => {
                        close()
                        onChangePlan()
                      }}
                    >
                      Изменить
                    </DropdownItem>
                  ) : null}
                  {onMakeRest ? (
                    <DropdownItem
                      icon={<Moon className="size-4" />}
                      disabled={busy}
                      onClick={() => {
                        close()
                        onMakeRest()
                      }}
                    >
                      Сделать отдыхом
                    </DropdownItem>
                  ) : null}
                </>
              )}
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}

      {status === 'in_progress' && href ? (
        <Link
          href={href}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-medium text-[var(--accent-fg)] transition hover:brightness-110"
        >
          <Play className="size-4 fill-current" />
          Продолжить тренировку
        </Link>
      ) : null}

      {status === 'finished' && href ? (
        <Link
          href={href}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]/40"
        >
          Открыть тренировку
        </Link>
      ) : null}
    </div>
  )
}

const appliedProgramWeeks = new Set<string>()
let prunedDefaultPrograms = false

function readRequestedProgram() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('program')
}

export function WeekPage() {
  const todayWeek = useMemo(() => startOfWeekMonday(new Date()), [])
  const [weekStart, setWeekStart] = useState(() => todayWeek)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => weekdayIndexMonday(new Date()))
  const [pickerOpen, setPickerOpen] = useState(false)
  const mode = useSessionStore((s) => s.mode)
  const trainings = useTrainingStore((s) => s.items)
  const loading = useTrainingStore((s) => s.loading)
  const fetchTrainings = useTrainingStore((s) => s.fetchList)
  const showLocalWindow = useTrainingStore((s) => s.showLocalWindow)
  const create = useTrainingStore((s) => s.create)
  const update = useTrainingStore((s) => s.update)
  const programs = useProgramStore((s) => s.items)
  const listReady = useProgramStore((s) => s.listReady)
  const programError = useProgramStore((s) => s.error)
  const currentProgram = useProgramStore((s) => s.current)
  const selectedProgramId = useProgramStore((s) => s.selectedId)
  const fetchPrograms = useProgramStore((s) => s.fetchList)
  const fetchProgram = useProgramStore((s) => s.fetchOne)
  const createProgram = useProgramStore((s) => s.create)
  const setSelectedProgramId = useProgramStore((s) => s.setSelectedId)
  const pruneDefaultDuplicates = useProgramStore((s) => s.pruneDefaultDuplicates)
  const applyProgram = useProgramStore((s) => s.apply)
  const templates = useTemplateStore((s) => s.items)
  const templateLoading = useTemplateStore((s) => s.loading)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)

  const [programId, setProgramId] = useState('')
  const [requestedProgram] = useState(readRequestedProgram)
  const [savingDay, setSavingDay] = useState<number | null>(null)
  const [dayOverrides, setDayOverrides] = useState<Record<string, string>>({})
  const [dayErrors, setDayErrors] = useState<Record<string, string>>({})
  const ensuringProgram = useRef(false)
  const replaceOnNextApply = useRef(Boolean(requestedProgram))

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
    setVisibleTrainingWindow(from, to)
    void fetchPrograms()
    void fetchTemplates()
    if (mode === 'local') {
      void fetchTrainings({ from, to, limit: 100 })
      return
    }
    showLocalWindow({ from, to })
    const snap = getSyncSnapshot()
    void (async () => {
      if (!snap) {
        await fetchTrainings({ from, to, limit: 100 })
        return
      }
      const live = await fetchCloudSyncState()
      if (trainingWindowNeedsFetch(from, to, live)) {
        await fetchTrainings({ from, to, limit: 100 })
        return
      }
      showLocalWindow({ from, to })
    })()
  }, [from, to, mode, fetchTrainings, fetchPrograms, fetchTemplates, showLocalWindow])

  useEffect(() => {
    if (!listReady) return
    let cancelled = false

    void (async () => {
      const pickProgram = (items: typeof programs) => {
        if (items.length === 0) return
        const choose = (id: string) => {
          setProgramId((current) => (current === id ? current : id))
          if (useProgramStore.getState().selectedId !== id) {
            setSelectedProgramId(id)
          }
        }
        if (requestedProgram && items.some((item) => item.id === requestedProgram)) {
          choose(requestedProgram)
          return
        }
        const selected = useProgramStore.getState().selectedId
        if (selected && items.some((item) => item.id === selected)) {
          choose(selected)
          return
        }
        const fallback = (items.find((item) => !item.isSystem) ?? items[0]).id
        choose(fallback)
      }

      pickProgram(useProgramStore.getState().items)

      if (!prunedDefaultPrograms) {
        prunedDefaultPrograms = true
        await pruneDefaultDuplicates()
        if (cancelled) return
        pickProgram(useProgramStore.getState().items)
      }
      if (cancelled) return

      const items = useProgramStore.getState().items
      if (items.length > 0) return

      if (programError || ensuringProgram.current) return
      ensuringProgram.current = true
      try {
        const program = await createProgram({ name: 'Моя неделя' })
        if (!cancelled) {
          setProgramId(program.id)
          setSelectedProgramId(program.id)
        }
        await fetchPrograms()
      } finally {
        ensuringProgram.current = false
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    listReady,
    programs,
    programError,
    requestedProgram,
    selectedProgramId,
    createProgram,
    fetchPrograms,
    pruneDefaultDuplicates,
    setSelectedProgramId,
  ])

  useEffect(() => {
    if (programId) void fetchProgram(programId)
  }, [programId, fetchProgram])

  useEffect(() => {
    if (!isCurrentWeek) return
    if (!programId || !currentProgram || currentProgram.id !== programId) return
    if (currentProgram.days.length === 0 && !replaceOnNextApply.current) return
    const key = `${programId}:${toDateKey(weekStart)}`
    const replacePlanned = replaceOnNextApply.current
    if (appliedProgramWeeks.has(key) && !replacePlanned) return
    appliedProgramWeeks.add(key)
    replaceOnNextApply.current = false
    void applyProgram(programId, toDateKey(weekStart), replacePlanned).then(() =>
      fetchTrainings({ from, to, limit: 100 }),
    )
  }, [isCurrentWeek, programId, currentProgram, weekStart, from, to, applyProgram, fetchTrainings])

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

  function primaryProgramDay(dayOfWeek: number) {
    const program = useProgramStore.getState().current
    if (!program || program.id !== programId) return null
    return (
      program.days
        .filter((d) => d.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.slotOrder - b.slotOrder)[0] ?? null
    )
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
  const dayError = dayErrors[selectedKey]
  const dayBusy = savingDay === selected.dayOfWeek
  const canAssign = scheduleReady && !hasInProgress && templates.length > 0
  const isSelectedToday = sameDay(selected.date, new Date())

  function pickTemplate(templateId: string) {
    setPickerOpen(false)
    void onDayPlanChange(selected.dayOfWeek, selected.date, templateId)
  }

  const initialLoading =
    (loading || templateLoading) && trainings.length === 0 && templates.length === 0

  if (initialLoading) {
    return <TabPageFallback title="Неделя" variant="week" />
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Неделя"
        action={
          programId && !currentProgram?.isSystem ? (
            <ShareResourceButton resourceType="program" resourceId={programId} label="" />
          ) : null
        }
      />

      <div className="mb-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => goToWeek(addDays(weekStart, -7))}
          aria-label="Предыдущая неделя"
          className="inline-flex size-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isCurrentWeek) goToWeek(todayWeek)
          }}
          className={cn(
            'min-w-0 px-1 text-center text-sm text-[var(--foreground)]',
            !isCurrentWeek && 'hover:text-[var(--accent)]',
          )}
          aria-label={isCurrentWeek ? formatWeekRange(weekStart) : 'К текущей неделе'}
        >
          {formatWeekRange(weekStart)}
        </button>
        <button
          type="button"
          onClick={() => goToWeek(addDays(weekStart, 7))}
          aria-label="Следующая неделя"
          className="inline-flex size-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div role="tablist" aria-label="Дни недели" className="mb-5 grid grid-cols-7 gap-1.5">
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
                'flex min-w-0 flex-col items-center gap-1 rounded-2xl px-0.5 py-2.5 text-center transition sm:px-1',
                selectedDay
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
                !selectedDay && isToday && 'text-[var(--accent)]',
              )}
            >
              <span className="text-[10px] font-medium tracking-wide sm:text-xs">{day.label}</span>
              <span
                className={cn(
                  'font-[family-name:var(--font-display)] text-base leading-none sm:text-lg',
                  !selectedDay && 'text-[var(--foreground)]',
                  !selectedDay && isToday && 'text-[var(--accent)]',
                )}
              >
                {day.date.getDate()}
              </span>
              <span
                className={cn(
                  'mt-0.5 size-1.5 rounded-full',
                  selectedDay
                    ? status === 'rest' || status === 'cancelled'
                      ? 'bg-transparent'
                      : 'bg-[var(--accent-fg)]'
                    : DOT_CLASS[status],
                )}
              />
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

      <section role="tabpanel">
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
                templateId={training.templateId}
                trainingId={training.id}
                highlight={isSelectedToday}
              />
            ))}

            {plannedItems.map((training) => (
              <DayTrainingCard
                key={training.id}
                title={templateLabel(templates, training.templateId)}
                status="planned"
                href={`/trainings/${training.id}`}
                templateId={training.templateId}
                trainingId={training.id}
                busy={dayBusy}
                highlight={isSelectedToday}
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
                templateId={selectedPlan || null}
                busy={dayBusy}
                highlight={isSelectedToday}
                onChangePlan={canAssign ? () => setPickerOpen(true) : undefined}
                onMakeRest={
                  canAssign
                    ? () => void onDayPlanChange(selected.dayOfWeek, selected.date, '')
                    : undefined
                }
              />
            ) : null}

            {finishedItems.map((training) => (
              <DayTrainingCard
                key={training.id}
                title={templateLabel(templates, training.templateId)}
                status="finished"
                href={`/trainings/${training.id}`}
                templateId={training.templateId}
                trainingId={training.id}
                highlight={isSelectedToday}
              />
            ))}

            {isRestDay ? (
              <div
                className={cn(
                  'rounded-2xl border border-dashed px-5 py-8 text-center',
                  isSelectedToday
                    ? 'border-[var(--accent)]/45 bg-[var(--accent)]/5'
                    : 'border-[var(--border)] bg-[var(--surface)]/40',
                )}
              >
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

            <div className="flex justify-center">
            {!isRestDay && !hasInProgress && !hasPlanned && !showOptimisticPlanned && canAssign ? (
              <Button
                type="button"
                variant="secondary"
                disabled={dayBusy}
                onClick={() => setPickerOpen(true)}
                className={cn(
                  'w-full ',
                  isSelectedToday && 'bg-[var(--accent)] text-[var(--accent-fg)] hover:border-[var(--accent)]/60 cursor-pointer',
                )}
              >
                <Plus className="size-4" />
                Назначить тренировку
              </Button>
            ) : null}
            </div>
            {dayError ? <p className="text-[11px] text-red-300">{dayError}</p> : null}
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
