import { parseCsv, parseInteger, parseNumber, rowValue } from '../csv-utils'
import { dateOnly, parseWorkoutDate } from '../date-utils'
import type { ParsedWorkout } from './../types'

export function parseFitNotesCsv(text: string): ParsedWorkout[] {
  const { rows } = parseCsv(text)
  const workouts = new Map<string, ParsedWorkout>()

  for (const row of rows) {
    const dateRaw = rowValue(row, 'Date')
    const startedAt = parseWorkoutDate(dateRaw) ?? parseWorkoutDate(`${dateRaw} 12:00:00`)
    if (!startedAt) continue

    const workoutKey = dateOnly(startedAt)
    let workout = workouts.get(workoutKey)
    if (!workout) {
      workout = {
        key: workoutKey,
        title: `Workout ${workoutKey}`,
        startedAt,
        finishedAt: null,
        notes: null,
        exercises: [],
      }
      workouts.set(workoutKey, workout)
    }

    const exerciseName = rowValue(row, 'Exercise')
    if (!exerciseName) continue

    let exercise = workout.exercises.find((item) => item.name === exerciseName)
    if (!exercise) {
      exercise = {
        name: exerciseName,
        muscleGroup: rowValue(row, 'Category') || null,
        notes: null,
        sets: [],
      }
      workout.exercises.push(exercise)
    }

    const weightKg = parseNumber(rowValue(row, 'Weight (kg)'))
    const weightLbs = parseNumber(rowValue(row, 'Weight (lbs)'))
    const notes = rowValue(row, 'Notes') || null

    exercise.sets.push({
      setNumber: exercise.sets.length + 1,
      weight: weightKg ?? weightLbs,
      reps: parseInteger(rowValue(row, 'Reps')),
      rpe: null,
      isWarmup: false,
      notes,
    })
  }

  return [...workouts.values()]
}
