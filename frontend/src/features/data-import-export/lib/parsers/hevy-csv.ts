import { parseCsv, parseInteger, parseNumber, rowValue } from '../csv-utils'
import { parseWorkoutDate } from '../date-utils'
import type { ParsedWorkout } from '../types'

function isWarmupSet(setType: string): boolean {
  const normalized = setType.trim().toLowerCase()
  return normalized === 'warmup' || normalized === 'warm-up'
}

export function parseHevyCsv(text: string): ParsedWorkout[] {
  const { rows } = parseCsv(text)
  const workouts = new Map<string, ParsedWorkout>()

  for (const row of rows) {
    const startRaw = rowValue(row, 'start_time')
    const startedAt = parseWorkoutDate(startRaw)
    if (!startedAt) continue

    const endRaw = rowValue(row, 'end_time')
    const finishedAt = endRaw ? parseWorkoutDate(endRaw) : null
    const workoutKey = startRaw
    let workout = workouts.get(workoutKey)
    if (!workout) {
      workout = {
        key: workoutKey,
        title: rowValue(row, 'title') || 'Workout',
        startedAt,
        finishedAt,
        notes: rowValue(row, 'description') || null,
        exercises: [],
      }
      workouts.set(workoutKey, workout)
    }

    const exerciseName = rowValue(row, 'exercise_title')
    if (!exerciseName) continue

    let exercise = workout.exercises.find((item) => item.name === exerciseName)
    if (!exercise) {
      exercise = {
        name: exerciseName,
        muscleGroup: null,
        notes: rowValue(row, 'exercise_notes') || null,
        sets: [],
      }
      workout.exercises.push(exercise)
    }

    const setType = rowValue(row, 'set_type')
    const setIndex = parseInteger(rowValue(row, 'set_index'))
    const setNumber = setIndex != null ? setIndex + 1 : exercise.sets.length + 1
    const weightKg = parseNumber(rowValue(row, 'weight_kg'))
    const weightLbs = parseNumber(rowValue(row, 'weight_lbs'))
    const weight = weightKg ?? weightLbs
    const rpe = parseNumber(rowValue(row, 'rpe'))

    exercise.sets.push({
      setNumber,
      weight,
      reps: parseInteger(rowValue(row, 'reps')),
      rpe,
      isWarmup: isWarmupSet(setType),
      notes: null,
    })
  }

  return [...workouts.values()]
}
