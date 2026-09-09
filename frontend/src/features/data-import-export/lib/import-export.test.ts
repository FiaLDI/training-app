import { describe, expect, it, beforeEach } from 'vitest'

import { localData } from '@/shared/lib/local-data'
import { setStorageScope } from '@/shared/lib/storage-scope'

import { detectCsvFormat } from './detect-csv-format'
import { parseCsv, parseNumber } from './csv-utils'
import { parseWorkoutDate } from './date-utils'
import { buildExportBundle } from './export-data'
import { importJsonBundle } from './import-workouts'
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

describe('importJsonBundle', () => {
  beforeEach(() => {
    localStorage.clear()
    setStorageScope('local')
  })

  it('does not copy cached plan exercises on top of imported rows', () => {
    localData.templates.create({ id: 'tpl-1', name: 'PPL' })
    localData.templates.addExercise('tpl-1', {
      id: 'tex-a',
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })
    localData.templates.addExercise('tpl-1', {
      id: 'tex-b',
      exerciseId: 'ex-b',
      exerciseOrder: 1,
      targetSets: 3,
    })
    localData.exercises.upsert({
      id: 'ex-a',
      userId: null,
      isSystem: false,
      name: 'Bench',
      description: null,
      muscleGroup: null,
      difficulty: null,
      metadata: {},
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    })

    importJsonBundle(
      {
        trainings: [
          {
            id: 'tr-imported',
            templateId: 'tpl-1',
            programId: null,
            programDayId: null,
            status: 'finished',
            scheduledAt: null,
            startedAt: '2026-08-31T12:00:00.000Z',
            finishedAt: '2026-08-31T13:00:00.000Z',
            notes: null,
            metadata: {},
            createdAt: '2026-08-31T12:00:00.000Z',
            groups: [],
            exercises: [
              {
                id: 'imported-row',
                trainingId: 'tr-imported',
                exerciseId: 'ex-a',
                exerciseOrder: 0,
                targetSets: 3,
                isWarmup: false,
                minReps: null,
                maxReps: null,
                maxWeight: null,
                previousMaxWeight: null,
                restSeconds: null,
                notes: null,
                groupId: null,
                positionInGroup: null,
                metadata: {},
                sets: [],
              },
            ],
          },
        ],
      },
      { cloudMode: false },
    )

    const training = localData.trainings.get('tr-imported')
    expect(training?.templateId).toBe('tpl-1')
    expect(training?.exercises.map((item) => item.id)).toEqual(['imported-row'])
  })

  it('does not import system catalog snapshots', () => {
    importJsonBundle(
      {
        exercises: [
          {
            id: 'sys-1',
            userId: null,
            isSystem: true,
            name: 'Жим лёжа',
            description: null,
            muscleGroup: null,
            difficulty: null,
            metadata: { catalogSyncedAt: '2026-01-01T00:00:00.000Z' },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      { cloudMode: false },
    )
    expect(localData.exercises.get('sys-1')).toBeNull()
  })

  it('skips a custom duplicate by name and remaps training exerciseId', () => {
    localData.exercises.upsert({
      id: 'local-bench',
      userId: null,
      isSystem: false,
      name: 'Жим лёжа',
      description: null,
      muscleGroup: null,
      difficulty: null,
      metadata: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const result = importJsonBundle(
      {
        exercises: [
          {
            id: 'imported-bench',
            userId: 'other-user',
            isSystem: false,
            name: 'жим лёжа',
            description: null,
            muscleGroup: null,
            difficulty: null,
            metadata: {},
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        trainings: [
          {
            id: 'tr-name-dup',
            templateId: null,
            programId: null,
            programDayId: null,
            status: 'finished',
            scheduledAt: null,
            startedAt: '2026-01-02T12:00:00.000Z',
            finishedAt: '2026-01-02T13:00:00.000Z',
            notes: null,
            metadata: {},
            createdAt: '2026-01-02T12:00:00.000Z',
            groups: [],
            exercises: [
              {
                id: 'row-1',
                trainingId: 'tr-name-dup',
                exerciseId: 'imported-bench',
                exerciseOrder: 0,
                targetSets: 1,
                isWarmup: false,
                minReps: null,
                maxReps: null,
                maxWeight: null,
                previousMaxWeight: null,
                restSeconds: null,
                notes: null,
                groupId: null,
                positionInGroup: null,
                metadata: {},
                sets: [],
              },
            ],
          },
        ],
      },
      { cloudMode: false },
    )

    expect(result.exercisesCreated).toBe(0)
    expect(localData.exercises.get('imported-bench')).toBeNull()
    expect(localData.trainings.get('tr-name-dup')?.exercises[0]?.exerciseId).toBe('local-bench')
  })
})

describe('buildExportBundle', () => {
  beforeEach(() => {
    localStorage.clear()
    setStorageScope('local')
  })

  it('omits system exercises from the user backup', () => {
    localData.exercises.upsert({
      id: 'sys-1',
      userId: null,
      isSystem: true,
      name: 'Присед',
      description: null,
      muscleGroup: null,
      difficulty: null,
      metadata: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    localData.exercises.create({ id: 'custom-1', name: 'Мой жим' })

    const bundle = buildExportBundle()
    expect(bundle.exercises.map((item) => item.id)).toEqual(['custom-1'])
  })
})
