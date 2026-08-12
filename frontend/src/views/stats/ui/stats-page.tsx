'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { BodyWeightSection } from '@/entities/body-measurement/ui/body-weight-section'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { ExerciseCombobox } from '@/entities/exercise/ui/exercise-combobox'
import { useSessionStore } from '@/entities/session/model/store'
import { statsApi } from '@/entities/stats/api/stats-api'
import { LastTrainingSummary } from '@/entities/stats/ui/last-training-summary'
import type { ExerciseProgressPoint, VolumeStatPoint } from '@/entities/stats/model/types'
import { SimpleBarChart } from '@/entities/stats/ui/simple-bar-chart'
import { trainingApi } from '@/entities/training/api/training-api'
import type { TrainingWithDetails } from '@/entities/training/model/types'
import { useTemplateStore } from '@/entities/template/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import { localData } from '@/shared/lib/local-data'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'

function defaultRange() {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  from.setDate(from.getDate() - 28)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString('ru-RU', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

function formatDuration(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt || !finishedAt) return null
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (ms <= 0) return null
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60) return `${totalMin} мин`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`
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

export function StatsPage() {
  const mode = useSessionStore((s) => s.mode)
  const exercises = useExerciseStore((s) => s.items)
  const fetchExercises = useExerciseStore((s) => s.fetchList)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)
  const trainings = useTrainingStore((s) => s.items)
  const fetchTrainings = useTrainingStore((s) => s.fetchList)
  const [volume, setVolume] = useState<VolumeStatPoint[]>([])
  const [progress, setProgress] = useState<ExerciseProgressPoint[]>([])
  const [exerciseId, setExerciseId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastTrainingDetails, setLastTrainingDetails] = useState<TrainingWithDetails | null>(null)
  const range = useMemo(() => defaultRange(), [])

  useEffect(() => {
    void fetchExercises('')
    void fetchTemplates()
    void fetchTrainings({ limit: 100 })
  }, [fetchExercises, fetchTemplates, fetchTrainings])

  useEffect(() => {
    if (!exerciseId && exercises.length > 0) {
      setExerciseId(exercises[0].id)
    }
  }, [exercises, exerciseId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const points =
          mode === 'local'
            ? localData.stats.volume(range.from, range.to)
            : (await statsApi.volume(range)).points
        if (cancelled) return
        setVolume(
          points.map((p) => ({
            date: p.date,
            volume: Number(p.volume) || 0,
          })),
        )
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить объём')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [mode, range])

  useEffect(() => {
    if (!exerciseId) {
      setProgress([])
      return
    }
    let cancelled = false
    async function load() {
      try {
        const points =
          mode === 'local'
            ? localData.stats.exerciseProgress(exerciseId, range.from, range.to)
            : (
                await statsApi.exerciseProgress({
                  exerciseId,
                  from: range.from,
                  to: range.to,
                })
              ).points
        if (cancelled) return
        setProgress(
          points.map((p) => ({
            date: p.date,
            maxWeight: p.maxWeight == null ? null : Number(p.maxWeight),
            bestVolume: Number(p.bestVolume) || 0,
          })),
        )
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить прогресс')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [mode, range, exerciseId])

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

  const finishedTrainings = useMemo(() => {
    return sessions
      .filter((t) => t.status === 'finished')
      .sort((a, b) => {
        const aKey = a.finishedAt ?? a.startedAt ?? a.createdAt
        const bKey = b.finishedAt ?? b.startedAt ?? b.createdAt
        return bKey.localeCompare(aKey)
      })
  }, [sessions])

  const lastFinishedTraining = useMemo(() => {
    return trainings
      .filter((t) => t.status === 'finished')
      .sort((a, b) => {
        const aKey = a.finishedAt ?? a.startedAt ?? a.createdAt
        const bKey = b.finishedAt ?? b.startedAt ?? b.createdAt
        return bKey.localeCompare(aKey)
      })[0] ?? null
  }, [trainings])

  useEffect(() => {
    if (!lastFinishedTraining) {
      setLastTrainingDetails(null)
      return
    }

    const local = localData.trainings.get(lastFinishedTraining.id)
    if (local && local.exercises.length > 0) {
      setLastTrainingDetails(local)
      return
    }

    if (mode === 'local') {
      setLastTrainingDetails(local)
      return
    }

    let cancelled = false
    void trainingApi
      .getById(lastFinishedTraining.id)
      .then((details) => {
        if (!cancelled) setLastTrainingDetails(details)
      })
      .catch(() => {
        if (!cancelled) setLastTrainingDetails(local)
      })

    return () => {
      cancelled = true
    }
  }, [lastFinishedTraining, mode])

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

  function resolveExerciseName(exerciseId: string) {
    return exercises.find((item) => item.id === exerciseId)?.name ?? 'Упражнение'
  }

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

  return (
    <div>
      <PageHeader
        title="Статистика"
        description="Сводка за последние 28 дней. Разминка не учитывается."
      />

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

      <LastTrainingSummary
        training={lastFinishedTraining}
        details={lastTrainingDetails}
        title={lastFinishedTraining ? trainingLabel(lastFinishedTraining.templateId) : 'Тренировка'}
        resolveExerciseName={resolveExerciseName}
        formatDuration={formatDuration}
        formatNumber={formatNumber}
      />

      <BodyWeightSection from={range.from} to={range.to} formatNumber={formatNumber} />

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

      <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
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

      <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl">Прогресс по упражнению</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Максимальный вес и лучший подход
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
            <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">Лучший подход (кг×повт.)</h3>
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
          <h2 className="font-[family-name:var(--font-display)] text-xl">Завершённые тренировки</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">За последние 28 дней</p>
        </div>

        {finishedTrainings.length === 0 ? (
          <EmptyState>Пока нет завершённых тренировок за этот период.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {finishedTrainings.map((training) => {
              const when = training.finishedAt ?? training.startedAt ?? training.createdAt
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
    </div>
  )
}
