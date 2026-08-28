import { parseCsv, parseInteger, parseNumber, rowValue } from '../csv-utils'
import { parseWorkoutDate } from '../date-utils'
import type { ParsedWorkout } from './types'

export function parseStrongCsv(text: string): ParsedWorkout[] {
  const { rows } = parseCsv(text)
  const workouts = new Map<string, ParsedWorkout>()

  for (const row of rows) {
    const dateRaw = rowValue(row, 'Date')
    const startedAt = parseWorkoutDate(dateRaw)
    if (!startedAt) continue

    const workoutName = rowValue(row, 'Workout Name') || 'Workout'
    const workoutKey = `${startedAt}|${workoutName}`
    let workout = workouts.get(workoutKey)
    if (!workout) {
      workout = {
        key: workoutKey,
        title: workoutName,
        startedAt,
        finishedAt: null,
        notes: rowValue(row, 'Workout Notes') || null,
        exercises: [],
      }
      workouts.set(workoutKey, workout)
    }

    const exerciseName = rowValue(row, 'Exercise Name')
    if (!exerciseName) continue

    let exercise = workout.exercises.find((item) => item.name === exerciseName)
    if (!exercise) {
      exercise = {
        name: exerciseName,
        muscleGroup: null,
        notes: null,
        sets: [],
      }
      workout.exercises.push(exercise)
    }

    const setNumber = parseInteger(rowValue(row, 'Set Order')) ?? exercise.sets.length + 1
    const notes = rowValue(row, 'Notes') || null
    const rpe = parseNumber(rowValue(row, 'RPE'))

    exercise.sets.push({
      setNumber,
      weight: parseNumber(rowValue(row, 'Weight')),
      reps: parseInteger(rowValue(row, 'Reps')),
      rpe,
      isWarmup: false,
      notes,
    })
  }

  return [...workouts.values()]
}
