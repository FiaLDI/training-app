'use client'

import { useEffect, useMemo, useState } from 'react'

import { useExerciseStore } from '@/entities/exercise/model/store'
import { useSessionStore } from '@/entities/session/model/store'
import { statsApi } from '@/entities/stats/api/stats-api'
import type { ExerciseProgressPoint, VolumeStatPoint } from '@/entities/stats/model/types'
import { SimpleBarChart } from '@/entities/stats/ui/simple-bar-chart'
import { useTrainingStore } from '@/entities/training/model/store'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import { localData } from '@/shared/lib/local-data'
import { PageHeader } from '@/shared/ui/page-header'
import { Select } from '@/shared/ui/select'

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
  const trainings = useTrainingStore((s) => s.items)
  const fetchTrainings = useTrainingStore((s) => s.fetchList)
  const [volume, setVolume] = useState<VolumeStatPoint[]>([])
  const [progress, setProgress] = useState<ExerciseProgressPoint[]>([])
  const [exerciseId, setExerciseId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const range = useMemo(() => defaultRange(), [])

  useEffect(() => {
    void fetchExercises()
    void fetchTrainings({ from: range.from, to: range.to, limit: 100 })
  }, [fetchExercises, fetchTrainings, range.from, range.to])

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

  return (
    <div>
      <PageHeader
        title="Статистика"
        description="Сводка за последние 28 дней. Разминка не учитывается."
      />

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

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

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl">Прогресс по упражнению</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Максимальный вес и лучший подход
            </p>
          </div>
          <label className="min-w-56 space-y-1 text-xs text-[var(--muted)]">
            Упражнение
            <Select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
              {exercises.length === 0 ? <option value="">Нет упражнений</option> : null}
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </Select>
          </label>
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
    </div>
  )
}
