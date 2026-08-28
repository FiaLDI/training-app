import { localData } from '@/shared/lib/local-data'

import { downloadBlob } from './export-data'

type CsvRow = {
  date: string
  workoutName: string
  duration: string
  exerciseName: string
  setOrder: number
  weight: string
  reps: string
  distance: string
  seconds: string
  notes: string
  workoutNotes: string
  rpe: string
}

const CSV_HEADERS = [
  'Date',
  'Workout Name',
  'Duration',
  'Exercise Name',
  'Set Order',
  'Weight',
  'Reps',
  'Distance',
  'Seconds',
  'Notes',
  'Workout Notes',
  'RPE',
] as const

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt || !finishedAt) return ''
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (ms <= 0) return ''
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`
}

export function buildCsvContent(): string {
  const rows: CsvRow[] = []

  const trainings = localData.trainings
    .list()
    .map((training) => localData.trainings.get(training.id))
    .filter((training) => training != null)
    .sort((a, b) => {
      const aWhen = a!.startedAt ?? a!.scheduledAt ?? a!.createdAt
      const bWhen = b!.startedAt ?? b!.scheduledAt ?? b!.createdAt
      return aWhen.localeCompare(bWhen)
    })

  for (const training of trainings) {
    if (!training) continue
    const when = training.startedAt ?? training.scheduledAt ?? training.createdAt
    const importTitle =
      typeof training.metadata?.importTitle === 'string'
        ? training.metadata.importTitle
        : null
    const workoutName = importTitle?.trim() || training.notes?.trim() || 'Workout'
    const duration = formatDuration(training.startedAt, training.finishedAt)
    const workoutNotes = training.notes ?? ''

    for (const exercise of training.exercises) {
      const exerciseMeta = localData.exercises.get(exercise.exerciseId)
      const exerciseName = exerciseMeta?.name ?? 'Unknown exercise'

      for (const set of exercise.sets) {
        rows.push({
          date: formatDate(when),
          workoutName,
          duration,
          exerciseName,
          setOrder: set.setNumber,
          weight: set.weight != null ? String(set.weight) : '',
          reps: set.reps != null ? String(set.reps) : '',
          distance: '',
          seconds: '',
          notes: exercise.notes ?? '',
          workoutNotes,
          rpe: set.rpe != null ? String(set.rpe) : '',
        })
      }
    }
  }

  const lines = [
    CSV_HEADERS.join(','),
    ...rows.map((row) =>
      [
        row.date,
        row.workoutName,
        row.duration,
        row.exerciseName,
        String(row.setOrder),
        row.weight,
        row.reps,
        row.distance,
        row.seconds,
        row.notes,
        row.workoutNotes,
        row.rpe,
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ]

  return lines.join('\n')
}

export function exportCsvFile(): void {
  const content = buildCsvContent()
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `ironlog-export-${stamp}.csv`)
}
