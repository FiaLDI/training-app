'use client'

import { useEffect, useState } from 'react'

import { useExerciseStore } from '@/entities/exercise/model/store'
import { useSessionStore } from '@/entities/session/model/store'
import { statsApi } from '@/entities/stats/api/stats-api'
import type { ExerciseProgressPoint, VolumeStatPoint } from '@/entities/stats/model/types'
import { SimpleBarChart } from '@/entities/stats/ui/simple-bar-chart'
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

export function StatsPage() {
  const mode = useSessionStore((s) => s.mode)
  const exercises = useExerciseStore((s) => s.items)
  const fetchExercises = useExerciseStore((s) => s.fetchList)
  const [volume, setVolume] = useState<VolumeStatPoint[]>([])
  const [progress, setProgress] = useState<ExerciseProgressPoint[]>([])
  const [exerciseId, setExerciseId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchExercises()
  }, [fetchExercises])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const range = defaultRange()
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
  }, [mode])

  useEffect(() => {
    if (!exerciseId) {
      setProgress([])
      return
    }
    let cancelled = false
    async function load() {
      const range = defaultRange()
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
  }, [mode, exerciseId])

  const progressAsVolume = progress.map((p) => ({
    date: p.date,
    volume: p.maxWeight ?? p.bestVolume,
  }))

  return (
    <div>
      <PageHeader
        title="Статистика"
        description="Объём и прогресс по упражнениям за последние 28 дней. Разминка не учитывается."
      />

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

      <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">Объём</h2>
        <SimpleBarChart points={volume} label="кг × повторения" />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Прогресс по упражнению</h2>
          <label className="min-w-56 space-y-1 text-xs text-[var(--muted)]">
            Упражнение
            <Select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
              <option value="">Выберите…</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <SimpleBarChart points={progressAsVolume} label="Макс. вес (кг)" />
      </section>
    </div>
  )
}
