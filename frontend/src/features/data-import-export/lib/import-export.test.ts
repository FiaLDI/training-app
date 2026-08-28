import { describe, expect, it } from 'vitest'

import { detectCsvFormat } from './detect-csv-format'
import { parseCsv, parseNumber } from './csv-utils'
import { parseWorkoutDate } from './date-utils'
import { parseFitNotesCsv } from './parsers/fitnotes-csv'
import { parseHevyCsv } from './parsers/hevy-csv'
import { parseStrongCsv } from './parsers/strong-csv'

const STRONG_SAMPLE = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2024-05-11 18:30,Upper A,45m,Bench Press (Barbell),1,80,8,,,,Felt strong,8
2024-05-11 18:30,Upper A,45m,Bench Press (Barbell),2,80,8,,,,Felt strong,8
2024-05-11 18:30,Upper A,45m,Row (Dumbbell),1,30,10,,,,Felt strong,7`

const HEVY_SAMPLE = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","weight_lbs","reps","distance_miles","duration_seconds","rpe"
"Push Day","28 Mar 2025, 17:29","28 Mar 2025, 18:52","","Bench Press (Barbell)",,"","0","normal","80",,"8",,,"8"
"Push Day","28 Mar 2025, 17:29","28 Mar 2025, 18:52","","Bench Press (Barbell)",,"","1","warmup","40",,"10",,,""`

const FITNOTES_SAMPLE = `Date,Exercise,Category,Weight (kg),Weight (lbs),Reps,Distance,Distance Unit,Time,Notes,Kind
2024-01-15,Squat,Legs,100,,5,,,,,wr
2024-01-15,Squat,Legs,100,,5,,,,,wr`

describe('csv-utils', () => {
  it('parses quoted csv rows', () => {
    const { headers, rows } = parseCsv(HEVY_SAMPLE)
    expect(headers[0]).toBe('title')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.['exercise_title']).toBe('Bench Press (Barbell)')
  })

  it('parses decimal numbers', () => {
    expect(parseNumber('80')).toBe(80)
    expect(parseNumber('')).toBeNull()
  })
})

describe('detectCsvFormat', () => {
  it('detects strong, hevy and fitnotes formats', () => {
    expect(detectCsvFormat(STRONG_SAMPLE)).toBe('strong')
    expect(detectCsvFormat(HEVY_SAMPLE)).toBe('hevy')
    expect(detectCsvFormat(FITNOTES_SAMPLE)).toBe('fitnotes')
  })
})

describe('date-utils', () => {
  it('parses strong and hevy date formats', () => {
    expect(parseWorkoutDate('2024-05-11 18:30:00')).toBeTruthy()
    expect(parseWorkoutDate('28 Mar 2025, 17:29')).toBeTruthy()
  })
})

describe('strong csv parser', () => {
  it('groups rows into one workout with two exercises', () => {
    const workouts = parseStrongCsv(STRONG_SAMPLE)
    expect(workouts).toHaveLength(1)
    expect(workouts[0]?.exercises).toHaveLength(2)
    expect(workouts[0]?.exercises[0]?.sets).toHaveLength(2)
    expect(workouts[0]?.title).toBe('Upper A')
  })
})

describe('hevy csv parser', () => {
  it('marks warmup sets and parses weights', () => {
    const workouts = parseHevyCsv(HEVY_SAMPLE)
    expect(workouts).toHaveLength(1)
    const exercise = workouts[0]?.exercises[0]
    expect(exercise?.sets).toHaveLength(2)
    expect(exercise?.sets[1]?.isWarmup).toBe(true)
    expect(exercise?.sets[0]?.weight).toBe(80)
  })
})

describe('fitnotes csv parser', () => {
  it('groups sets by date into one workout', () => {
    const workouts = parseFitNotesCsv(FITNOTES_SAMPLE)
    expect(workouts).toHaveLength(1)
    expect(workouts[0]?.exercises[0]?.sets).toHaveLength(2)
    expect(workouts[0]?.exercises[0]?.muscleGroup).toBe('Legs')
  })
})
