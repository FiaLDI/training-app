'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { BodyWeightSection } from '@/entities/body-measurement/ui/body-weight-section'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { ExerciseCombobox } from '@/entities/exercise/ui/exercise-combobox'
import { useSessionStore } from '@/entities/session/model/store'
import { statsApi } from '@/entities/stats/api/stats-api'
import { muscleStatsToDiagram } from '@/entities/stats/lib/muscle-diagram-stats'
import { STATS_PERIOD_LABELS, statsPeriodRange, type StatsPeriod } from '@/entities/stats/lib/period-range'
import type {
  ActivityStatPoint,
  ExerciseProgressPoint,
  MuscleGroupStatPoint,
  StrengthCorrelationPoint,
  VolumeStatPoint,
} from '@/entities/stats/model/types'
import { DualSeriesChart } from '@/entities/stats/ui/dual-series-chart'
import { MuscleGroupChart } from '@/entities/stats/ui/muscle-group-chart'
import { SimpleBarChart } from '@/entities/stats/ui/simple-bar-chart'
import type { Training } from '@/entities/training/model/types'
import { useTemplateStore } from '@/entities/template/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { ActivityHeatmap } from '@/entities/training/ui/activity-heatmap'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import {
  hasHighlightableMuscleGroups,
  MuscleDiagram,
} from '@/entities/exercise/ui/muscle-diagram'
import { cn } from '@/shared/lib/cn'
import { formatDuration, formatNumber } from '@/shared/lib/format'
import { localData } from '@/shared/lib/local-data'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { TabPageFallback } from '@/shared/ui/tab-page-fallback'

type StatsTab = 'overview' | 'progress' | 'trainings' | 'weight'
type StatusFilter = 'all' | 'finished' | 'planned' | 'cancelled'

const TABS: Array<{ id: StatsTab; label: string }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'progress', label: 'Прогресс' },
  { id: 'trainings', label: 'Тренировки' },
  { id: 'weight', label: 'Вес' },
]

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'finished', label: 'Завершены' },
  { id: 'planned', label: 'Запланированы' },
  { id: 'cancelled', label: 'Отменены' },
]

const PERIOD_OPTIONS: Array<{ id: StatsPeriod; label: string }> = [
  { id: 'week', label: STATS_PERIOD_LABELS.week },
  { id: 'month', label: STATS_PERIOD_LABELS.month },
  { id: 'year', label: STATS_PERIOD_LABELS.year },
]

const TAB_DESCRIPTIONS: Record<StatsTab, string> = {
  overview: 'Сводка, распределение по мышечным группам и карта активности.',
  progress: 'Прогресс по упражнению и корреляция веса тела с силой.',
  trainings: 'Список сессий с фильтром по статусу.',
  weight: 'Запись веса и динамика.',
}

type MetricCardProps = {
  label: string
  value: string
  hint?: string
}

function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  )
}

type SegmentedControlProps<T extends string> = {
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (value: T) => void
}

function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm transition',
              active
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function trainingWhen(training: Training) {
  if (training.status === 'planned') return training.scheduledAt ?? training.createdAt
  if (training.status === 'finished') {
    return training.finishedAt ?? training.startedAt ?? training.createdAt
  }
  return training.startedAt ?? training.scheduledAt ?? training.createdAt
}

const EMPTY_BY_FILTER: Record<StatusFilter, string> = {
  all: 'Пока нет тренировок.',
  finished: 'Пока нет завершённых тренировок.',
  planned: 'Нет запланированных тренировок.',
  cancelled: 'Нет отменённых тренировок.',
}

export function StatsPage() {
  const mode = useSessionStore((s) => s.mode)
  const exercises = useExerciseStore((s) => s.items)
  const fetchExercises = useExerciseStore((s) => s.fetchList)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)
  const trainings = useTrainingStore((s) => s.items)
  const fetchTrainings = useTrainingStore((s) => s.fetchList)
  const [tab, setTab] = useState<StatsTab>('overview')
  const [period, setPeriod] = useState<StatsPeriod>('month')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [volume, setVolume] = useState<VolumeStatPoint[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupStatPoint[]>([])
  const [activity, setActivity] = useState<ActivityStatPoint[]>([])
  const [progress, setProgress] = useState<ExerciseProgressPoint[]>([])
  const [correlation, setCorrelation] = useState<StrengthCorrelationPoint[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [progressLoading, setProgressLoading] = useState(false)
  const [exerciseId, setExerciseId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(() => statsPeriodRange(period), [period])
  const yearRange = useMemo(() => statsPeriodRange('year'), [])

  useEffect(() => {
    void fetchExercises()
    void fetchTemplates()
    void fetchTrainings({ limit: 100 })
  }, [fetchExercises, fetchTemplates, fetchTrainings])

  useEffect(() => {
    if (!exerciseId && exercises.length > 0) {
      setExerciseId(exercises[0].id)
    }
  }, [exercises, exerciseId])

  useEffect(() => {
    if (tab !== 'overview') return
    let cancelled = false
    async function load() {
      setOverviewLoading(true)
      try {
        if (mode === 'local') {
          const points = localData.stats.volume(range.from, range.to)
          const groups = localData.stats.muscleGroups(range.from, range.to)
          const activityPoints = localData.stats.activity(yearRange.from, yearRange.to)
          if (cancelled) return
          setVolume(points.map((p) => ({ date: p.date, volume: Number(p.volume) || 0 })))
          setMuscleGroups(groups)
          setActivity(activityPoints)
        } else {
          const [volumeRes, groupsRes, activityRes] = await Promise.all([
            statsApi.volume(range),
            statsApi.muscleGroups(range),
            statsApi.activity(yearRange),
          ])
          if (cancelled) return
          setVolume(
            volumeRes.points.map((p) => ({
              date: p.date,
              volume: Number(p.volume) || 0,
            })),
          )
          setMuscleGroups(groupsRes.groups)
          setActivity(activityRes.points)
        }
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику')
        }
      } finally {
        if (!cancelled) setOverviewLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [mode, range, yearRange, tab])

  useEffect(() => {
    if (tab !== 'progress') return
    if (!exerciseId) {
      setProgress([])
      setCorrelation([])
      setProgressLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setProgressLoading(true)
      try {
        if (mode === 'local') {
          const points = localData.stats.exerciseProgress(exerciseId, range.from, range.to)
          const corr = localData.stats.strengthCorrelation(exerciseId, range.from, range.to)
          if (cancelled) return
          setProgress(
            points.map((p) => ({
              date: p.date,
              maxWeight: p.maxWeight == null ? null : Number(p.maxWeight),
              bestVolume: Number(p.bestVolume) || 0,
            })),
          )
          setCorrelation(corr)
        } else {
          const [progressRes, corrRes] = await Promise.all([
            statsApi.exerciseProgress({ exerciseId, ...range }),
            statsApi.strengthCorrelation({ exerciseId, ...range }),
          ])
          if (cancelled) return
          setProgress(
            progressRes.points.map((p) => ({
              date: p.date,
              maxWeight: p.maxWeight == null ? null : Number(p.maxWeight),
              bestVolume: Number(p.bestVolume) || 0,
            })),
          )
          setCorrelation(corrRes.points)
        }
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить прогресс')
        }
      } finally {
        if (!cancelled) setProgressLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [mode, range, exerciseId, tab])

  const sessions = useMemo(() => {
    const fromMs = new Date(range.from).getTime()
    const toMs = new Date(range.to).getTime()
    return trainings.filter((t) => {
      if (t.status !== 'finished' && t.status !== 'in_progress') return false
      const when = t.startedAt ?? t.scheduledAt ?? t.createdAt
      const ms = new Date(when).getTime()
      return ms >= fromMs && ms <= toMs
    })
  }, [trainings, range.from, range.to])

  const listedTrainings = useMemo(() => {
    return trainings
      .filter((t) => (statusFilter === 'all' ? true : t.status === statusFilter))
      .sort((a, b) => trainingWhen(b).localeCompare(trainingWhen(a)))
  }, [trainings, statusFilter])

  function trainingLabel(templateId: string | null) {
    if (!templateId) return 'Тренировка'
    return templates.find((t) => t.id === templateId)?.name ?? 'Тренировка'
  }

  const overview = useMemo(() => {
    const totalVolume = volume.reduce((sum, p) => sum + p.volume, 0)
    const trainingDays = volume.length
    const sessionCount = sessions.length
    const finishedCount = sessions.filter((t) => t.status === 'finished').length
    const bestDay = volume.reduce<{ date: string; volume: number } | null>((best, point) => {
      if (!best || point.volume > best.volume) return point
      return best
    }, null)
    const avgPerSession = sessionCount > 0 ? totalVolume / sessionCount : 0
    const avgPerDay = trainingDays > 0 ? totalVolume / trainingDays : 0

    const dayKeys = new Set(
      sessions.map((t) => toDateKey(new Date(t.startedAt ?? t.scheduledAt ?? t.createdAt))),
    )
    let streak = 0
    const cursor = new Date()
    cursor.setHours(12, 0, 0, 0)
    for (;;) {
      const key = toDateKey(cursor)
      if (!dayKeys.has(key)) break
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    return {
      totalVolume,
      trainingDays,
      sessionCount,
      finishedCount,
      bestDay,
      avgPerSession,
      avgPerDay,
      streak,
    }
  }, [volume, sessions])

  const exerciseMetrics = useMemo(() => {
    if (progress.length === 0) {
      return {
        maxWeight: null as number | null,
        bestVolume: 0,
        sessions: 0,
        weightDelta: null as number | null,
      }
    }
    const weights = progress
      .map((p) => p.maxWeight)
      .filter((w): w is number => w != null)
    const maxWeight = weights.length > 0 ? Math.max(...weights) : null
    const bestVolume = Math.max(...progress.map((p) => p.bestVolume))
    const firstWeight = weights[0] ?? null
    const lastWeight = weights[weights.length - 1] ?? null
    const weightDelta =
      firstWeight != null && lastWeight != null ? lastWeight - firstWeight : null
    return {
      maxWeight,
      bestVolume,
      sessions: progress.length,
      weightDelta,
    }
  }, [progress])

  const selectedExercise = exercises.find((e) => e.id === exerciseId)

  const volumeChart = volume.map((p) => ({ date: p.date, value: p.volume }))
  const weightChart = progress.map((p) => ({
    date: p.date,
    value: p.maxWeight ?? 0,
  }))
  const bestSetChart = progress.map((p) => ({
    date: p.date,
    value: p.bestVolume,
  }))
  const correlationChart = correlation.map((p) => ({
    date: p.date,
    primary: p.maxWeight,
    secondary: p.bodyWeight,
  }))

  const muscleDiagram = useMemo(() => muscleStatsToDiagram(muscleGroups), [muscleGroups])
  const showMuscleDiagram = hasHighlightableMuscleGroups(muscleDiagram.groups)

  const periodHint =
    period === 'week'
      ? '7 дней'
      : period === 'month'
        ? '28 дней'
        : '365 дней'

  return (
    <div>
      <PageHeader title="Статистика" description={TAB_DESCRIPTIONS[tab]} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl value={tab} options={TABS} onChange={setTab} />
        {(tab === 'overview' || tab === 'progress') && (
          <div className="sm:w-56">
            <SegmentedControl value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />
          </div>
        )}
      </div>

      {error && (tab === 'overview' || tab === 'progress') ? (
        <p className="mb-4 text-sm text-red-300">{error}</p>
      ) : null}

      {tab === 'overview' ? (
        overviewLoading && volume.length === 0 ? (
          <TabPageFallback title="Статистика" variant="stats" withHeader={false} />
        ) : (
        <>
          <p className="mb-4 text-xs text-[var(--muted)]">
            Период: {periodHint}. Разминочные подходы не учитываются.
          </p>

          <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Общий объём"
              value={formatNumber(Math.round(overview.totalVolume))}
              hint="кг × повторения"
            />
            <MetricCard
              label="Тренировки"
              value={String(overview.sessionCount)}
              hint={`завершено: ${overview.finishedCount}`}
            />
            <MetricCard
              label="Дней с нагрузкой"
              value={String(overview.trainingDays)}
              hint={
                overview.bestDay
                  ? `лучший день: ${formatNumber(Math.round(overview.bestDay.volume))}`
                  : 'нет данных'
              }
            />
            <MetricCard
              label="Серия"
              value={overview.streak > 0 ? `${overview.streak} дн.` : '—'}
              hint={
                overview.avgPerSession > 0
                  ? `сред. объём: ${formatNumber(Math.round(overview.avgPerSession))}`
                  : 'подряд до сегодня'
              }
            />
          </section>

          <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <ActivityHeatmap points={activity} />
          </section>

          <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl">Объём по дням</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Сколько килограмм×повторений сделано в каждый день
                </p>
              </div>
              {overview.avgPerDay > 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  В среднем {formatNumber(Math.round(overview.avgPerDay))} / день с тренировкой
                </p>
              ) : null}
            </div>
            <SimpleBarChart points={volumeChart} unit="кг×повт." />
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-4">
              <h2 className="font-[family-name:var(--font-display)] text-xl">Нагрузка по группам</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Распределение объёма и подходов по мышечным группам за {periodHint.toLowerCase()}
              </p>
            </div>

            <div
              className={cn(
                'gap-6',
                showMuscleDiagram ? 'grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]' : '',
              )}
            >
              {showMuscleDiagram ? (
                <div className="flex items-center justify-center rounded-xl bg-[var(--surface-2)]/40 px-2 py-4">
                  <MuscleDiagram
                    groups={muscleDiagram.groups}
                    intensityByGroup={muscleDiagram.intensityByGroup}
                  />
                </div>
              ) : null}

              <MuscleGroupChart
                groups={muscleGroups.map((g) => ({
                  label: g.muscleGroup,
                  volume: g.volume,
                  sets: g.sets,
                }))}
              />
            </div>
          </section>
        </>
        )
      ) : null}

      {tab === 'progress' ? (
        progressLoading && progress.length === 0 && exerciseId ? (
          <TabPageFallback title="Статистика" variant="stats" withHeader={false} />
        ) : (
        <div className="space-y-8">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl">Прогресс по упражнению</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Максимальный вес и лучший подход · {periodHint.toLowerCase()}
                </p>
              </div>
              <div className="min-w-56 space-y-1 text-xs text-[var(--muted)]">
                Упражнение
                <ExerciseCombobox
                  exercises={exercises}
                  value={exerciseId}
                  onChange={setExerciseId}
                  placeholder={exercises.length === 0 ? 'Нет упражнений' : 'Найти упражнение…'}
                  disabled={exercises.length === 0}
                />
              </div>
            </div>

            {selectedExercise ? (
              <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Макс. вес"
                  value={
                    exerciseMetrics.maxWeight != null
                      ? `${formatNumber(exerciseMetrics.maxWeight, 1)} кг`
                      : '—'
                  }
                />
                <MetricCard
                  label="Лучший подход"
                  value={formatNumber(Math.round(exerciseMetrics.bestVolume))}
                  hint="кг × повторения"
                />
                <MetricCard
                  label="Сессий"
                  value={String(exerciseMetrics.sessions)}
                  hint="дней с этим упражнением"
                />
                <MetricCard
                  label="Динамика веса"
                  value={
                    exerciseMetrics.weightDelta == null
                      ? '—'
                      : `${exerciseMetrics.weightDelta > 0 ? '+' : ''}${formatNumber(exerciseMetrics.weightDelta, 1)} кг`
                  }
                  hint="от первой к последней записи"
                />
              </div>
            ) : null}

            <div className="space-y-8">
              <div>
                <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">Максимальный вес</h3>
                <SimpleBarChart
                  points={weightChart}
                  unit="кг"
                  emptyText="Выбери упражнение или запиши подходы."
                />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">
                  Лучший подход (кг×повт.)
                </h3>
                <SimpleBarChart
                  points={bestSetChart}
                  unit="кг×повт."
                  emptyText="Выбери упражнение или запиши подходы."
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-4">
              <h2 className="font-[family-name:var(--font-display)] text-xl">Вес тела и сила</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Корреляция массы тела с максимальным рабочим весом
                {selectedExercise ? ` (${selectedExercise.name})` : ''}
              </p>
            </div>
            <DualSeriesChart
              points={correlationChart}
              primaryLabel="Макс. вес"
              secondaryLabel="Вес тела"
              primaryUnit="кг"
              secondaryUnit="кг"
              emptyText="Нужны записи веса тела и рабочие подходы по упражнению."
            />
          </section>
        </div>
        )
      ) : null}

      {tab === 'trainings' ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl">Список тренировок</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {listedTrainings.length}{' '}
                {listedTrainings.length === 1
                  ? 'сессия'
                  : listedTrainings.length > 1 && listedTrainings.length < 5
                    ? 'сессии'
                    : 'сессий'}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <SegmentedControl
              value={statusFilter}
              options={STATUS_FILTERS}
              onChange={setStatusFilter}
            />
          </div>

          {listedTrainings.length === 0 ? (
            <EmptyState>{EMPTY_BY_FILTER[statusFilter]}</EmptyState>
          ) : (
            <ul className="space-y-2">
              {listedTrainings.map((training) => {
                const when = trainingWhen(training)
                const duration = formatDuration(training.startedAt, training.finishedAt)
                return (
                  <li key={training.id}>
                    <Link
                      href={`/trainings/${training.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3 transition hover:border-[var(--accent)]/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">
                          {trainingLabel(training.templateId)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {new Date(when).toLocaleString('ru-RU')}
                          {duration ? ` · ${duration}` : ''}
                        </p>
                      </div>
                      <TrainingStatusBadge status={training.status} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'weight' ? <BodyWeightSection /> : null}
    </div>
  )
}
