import type { TrainingWithDetails } from '@/entities/training/model/types'

export type SetSummary = {
  setNumber: number
  weight: number | null
  reps: number | null
  isWarmup: boolean
}

export type ExerciseSummary = {
  id: string
  name: string
  sets: SetSummary[]
}

export type TrainingSummary = {
  exerciseCount: number
  setCount: number
  volume: number
  exercises: ExerciseSummary[]
}

function formatSet(set: SetSummary) {
  let line: string
  if (set.weight != null && set.reps != null) {
    line = `${set.weight}×${set.reps}`
  } else if (set.weight != null) {
    line = `${set.weight} кг`
  } else if (set.reps != null) {
    line = `${set.reps} повт.`
  } else {
    line = `#${set.setNumber}`
  }
  return set.isWarmup ? `${line} (разм.)` : line
}

export function formatSetLine(sets: SetSummary[]) {
  const completed = sets.filter((set) => set.weight != null || set.reps != null)
  if (completed.length === 0) return 'без подходов'
  return completed.map(formatSet).join(' · ')
}

export function summarizeTraining(
  training: TrainingWithDetails,
  resolveExerciseName: (exerciseId: string) => string,
): TrainingSummary {
  const sorted = [...training.exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)
  const exercises: ExerciseSummary[] = []
  let volume = 0
  let setCount = 0

  for (const exercise of sorted) {
    const sets = exercise.sets
      .filter((set) => set.completed)
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        isWarmup: set.isWarmup ?? false,
      }))

    if (sets.length === 0) continue

    for (const set of sets) {
      if (set.isWarmup) continue
      setCount += 1
      if (set.weight != null && set.reps != null) {
        volume += set.weight * set.reps
      }
    }

    exercises.push({
      id: exercise.id,
      name: resolveExerciseName(exercise.exerciseId),
      sets,
    })
  }

  return {
    exerciseCount: exercises.length,
    setCount,
    volume,
    exercises,
  }
}
