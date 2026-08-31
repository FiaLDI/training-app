import type { TrainingSyncMeta, TrainingWithDetails } from '@/entities/training/model/types'
import { localData } from '@/shared/lib/local-data'
import { createLocalId } from '@/shared/lib/local-id'

import { createExerciseResolver } from './exercise-resolver'
import type { ImportResult, ParsedWorkout, ParsedWorkoutImportResult } from './types'

function pendingSyncMeta(cloudMode: boolean): TrainingSyncMeta {
  return {
    status: 'pending',
    reason: cloudMode ? 'queued' : 'local_mode',
  }
}

function stripSyncMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const { sync: _sync, ...rest } = metadata
  return rest
}

function workoutExists(key: string, startedAt: string): boolean {
  const day = startedAt.slice(0, 10)
  return localData.trainings.list().some((training) => {
    const when = training.startedAt ?? training.scheduledAt ?? training.createdAt
    const importSource = training.metadata?.importSource
    return when.slice(0, 10) === day && importSource === key
  })
}

export function importParsedWorkouts(
  workouts: ParsedWorkout[],
  options: { cloudMode: boolean; skipDuplicates?: boolean },
): ParsedWorkoutImportResult {
  const resolver = createExerciseResolver()
  let workoutsImported = 0
  let workoutsSkipped = 0
  let setsImported = 0
  const warnings: string[] = []

  for (const workout of workouts) {
    if (workout.exercises.length === 0) {
      workoutsSkipped += 1
      continue
    }

    if (options.skipDuplicates && workoutExists(workout.key, workout.startedAt)) {
      workoutsSkipped += 1
      continue
    }

    const training = localData.trainings.create({
      status: 'finished',
      startedAt: workout.startedAt,
      finishedAt: workout.finishedAt ?? workout.startedAt,
      notes: workout.notes,
      metadata: {
        sync: pendingSyncMeta(options.cloudMode),
        importSource: workout.key,
        importTitle: workout.title,
      },
    })

    workout.exercises.forEach((parsedExercise, exerciseIndex) => {
      const exerciseId = resolver.resolve(parsedExercise.name, parsedExercise.muscleGroup)
      const completedSets = parsedExercise.sets.filter(
        (set) => set.weight != null || set.reps != null,
      )
      const trainingExercise = localData.trainings.addExercise(training.id, {
        exerciseId,
        exerciseOrder: exerciseIndex + 1,
        targetSets: Math.max(completedSets.length, 1),
        isWarmup: completedSets.every((set) => set.isWarmup),
        notes: parsedExercise.notes,
      })
      if (!trainingExercise) return

      for (const set of completedSets) {
        localData.trainings.addSet(trainingExercise.id, {
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe,
          completed: true,
          isWarmup: set.isWarmup,
        })
        setsImported += 1
      }
    })

    workoutsImported += 1
  }

  if (workoutsImported === 0 && workouts.length > 0) {
    warnings.push('Ни одна тренировка не была импортирована — возможно, все дубликаты.')
  }

  return {
    workoutsImported,
    workoutsSkipped,
    exercisesCreated: resolver.createdCount,
    setsImported,
    warnings,
  }
}

export function importJsonBundle(
  raw: unknown,
  options: { cloudMode: boolean },
): ImportResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Некорректный JSON-файл')
  }

  const bundle = raw as Record<string, unknown>
  const warnings: string[] = []
  let workoutsImported = 0
  let workoutsSkipped = 0
  let setsImported = 0
  let exercisesCreated = 0

  const exercises = Array.isArray(bundle.exercises) ? bundle.exercises : []
  for (const exercise of exercises) {
    if (!exercise || typeof exercise !== 'object') continue
    const item = exercise as Record<string, unknown>
    if (typeof item.id !== 'string' || typeof item.name !== 'string') continue
    if (localData.exercises.get(item.id)) continue
    localData.exercises.upsert({
      id: item.id,
      userId: typeof item.userId === 'string' ? item.userId : null,
      name: item.name,
      description: typeof item.description === 'string' ? item.description : null,
      muscleGroup: typeof item.muscleGroup === 'string' ? item.muscleGroup : null,
      difficulty: typeof item.difficulty === 'string' ? item.difficulty : null,
      metadata:
        item.metadata && typeof item.metadata === 'object'
          ? (item.metadata as Record<string, unknown>)
          : {},
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
    })
    exercisesCreated += 1
  }

  const trainings = Array.isArray(bundle.trainings) ? bundle.trainings : []
  for (const training of trainings) {
    if (!training || typeof training !== 'object') continue
    const item = training as TrainingWithDetails
    if (!item.id || localData.trainings.get(item.id)) {
      workoutsSkipped += 1
      continue
    }

    const metadata = stripSyncMetadata(item.metadata ?? {})
    localData.trainings.create(
      {
        id: item.id,
        templateId: item.templateId ?? null,
        programId: item.programId ?? null,
        programDayId: item.programDayId ?? null,
        status: item.status ?? 'finished',
        scheduledAt: item.scheduledAt ?? null,
        startedAt: item.startedAt ?? null,
        finishedAt: item.finishedAt ?? null,
        notes: item.notes ?? null,
        metadata: {
          ...metadata,
          sync: pendingSyncMeta(options.cloudMode),
        },
      },
      { skipTemplateCopy: true },
    )

    for (const exercise of item.exercises ?? []) {
      const exerciseId = exercise.exerciseId
      if (!exerciseId) continue
      const trainingExercise = localData.trainings.addExercise(item.id, {
        id: exercise.id ?? createLocalId(),
        exerciseId,
        exerciseOrder: exercise.exerciseOrder,
        targetSets: exercise.targetSets,
        isWarmup: exercise.isWarmup ?? false,
        minReps: exercise.minReps ?? null,
        maxReps: exercise.maxReps ?? null,
        maxWeight: exercise.maxWeight ?? null,
        previousMaxWeight: exercise.previousMaxWeight ?? null,
        restSeconds: exercise.restSeconds ?? null,
        notes: exercise.notes ?? null,
        groupId: exercise.groupId ?? null,
        positionInGroup: exercise.positionInGroup ?? null,
        metadata: exercise.metadata ?? {},
      })
      if (!trainingExercise) continue

      for (const set of exercise.sets ?? []) {
        localData.trainings.addSet(trainingExercise.id, {
          id: set.id ?? createLocalId(),
          setNumber: set.setNumber,
          weight: set.weight ?? null,
          reps: set.reps ?? null,
          rir: set.rir ?? null,
          rpe: set.rpe ?? null,
          completed: set.completed ?? true,
          isWarmup: set.isWarmup ?? false,
          metadata: set.metadata ?? {},
        })
        setsImported += 1
      }
    }

    for (const group of item.groups ?? []) {
      localData.trainings.upsertGroup({
        id: group.id,
        trainingId: item.id,
        type: group.type,
        groupOrder: group.groupOrder,
        restSeconds: group.restSeconds ?? null,
        metadata: group.metadata ?? {},
      })
    }

    workoutsImported += 1
  }

  const bodyMeasurements = Array.isArray(bundle.bodyMeasurements) ? bundle.bodyMeasurements : []
  for (const measurement of bodyMeasurements) {
    if (!measurement || typeof measurement !== 'object') continue
    const item = measurement as Record<string, unknown>
    if (typeof item.id !== 'string') continue
    if (localData.bodyMeasurements.list().some((row) => row.id === item.id)) continue
    if (typeof item.weight !== 'number') continue
    localData.bodyMeasurements.upsert({
      id: item.id,
      weight: item.weight,
      measuredAt:
        typeof item.measuredAt === 'string' ? item.measuredAt : new Date().toISOString(),
      metadata:
        item.metadata && typeof item.metadata === 'object'
          ? (item.metadata as Record<string, unknown>)
          : {},
    })
  }

  return {
    format: 'json',
    workoutsImported,
    workoutsSkipped,
    exercisesCreated,
    setsImported,
    warnings,
  }
}
