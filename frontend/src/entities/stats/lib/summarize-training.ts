import type { TrainingWithDetails } from '@/entities/training/model/types'

export type SetSummary = {
  setNumber: number
  weight: number | null
  reps: number | null
}

export type ExerciseSummary = {
  id: string
  name: string
  isWarmup: boolean
  sets: SetSummary[]
}

export type TrainingSummary = {
  exerciseCount: number
  setCount: number
  volume: number
  exercises: ExerciseSummary[]
}

function formatSet(set: SetSummary) {
  if (set.weight != null && set.reps != null) {
    return `${set.weight}×${set.reps}`
  }
  if (set.weight != null) return `${set.weight} кг`
  if (set.reps != null) return `${set.reps} повт.`
  return `#${set.setNumber}`
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
    if (exercise.isWarmup) continue

    const sets = exercise.sets
      .filter((set) => set.completed)
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
      }))

    for (const set of sets) {
      setCount += 1
      if (set.weight != null && set.reps != null) {
        volume += set.weight * set.reps
      }
    }

    exercises.push({
      id: exercise.id,
      name: resolveExerciseName(exercise.exerciseId),
      isWarmup: exercise.isWarmup,
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
