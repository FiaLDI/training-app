import { createLocalCollection } from '@/shared/lib/local-db'
import { createLocalId } from '@/shared/lib/local-id'

import type {
  BodyMeasurement,
  CreateBodyMeasurementInput,
} from '@/entities/body-measurement/model/types'
import type {
  CreateFeedbackInput,
  FeedbackSyncStatus,
  LocalFeedback,
} from '@/entities/feedback/model/types'
import type {
  CreateExerciseInput,
  Exercise,
  UpdateExerciseInput,
} from '@/entities/exercise/model/types'
import type {
  CreateSourceInput,
  ExerciseSource,
} from '@/entities/source/model/types'
import type {
  CreateProgramDayInput,
  CreateProgramInput,
  Program,
  ProgramDay,
  ProgramWithDays,
  UpdateProgramDayInput,
} from '@/entities/program/model/types'
import type {
  CreateTemplateExerciseInput,
  CreateTemplateInput,
  TemplateExercise,
  UpdateTemplateExerciseInput,
  WorkoutTemplate,
  WorkoutTemplateWithExercises,
} from '@/entities/template/model/types'
import type {
  CreateTrainingExerciseInput,
  CreateTrainingInput,
  CreateTrainingSetInput,
  Training,
  TrainingExercise,
  TrainingSet,
  TrainingSyncMeta,
  TrainingWithDetails,
  UpdateTrainingExerciseInput,
} from '@/entities/training/model/types'
import type {
  ExerciseProgressPoint,
  VolumeStatPoint,
} from '@/entities/stats/model/types'
import {
  trainingOccurredAt,
  workingSetMaxWeight,
} from '@/entities/training/lib/session-weight'

const exercisesDb = createLocalCollection<Exercise>('ironlog:local:exercises')
const sourcesDb = createLocalCollection<ExerciseSource>('ironlog:local:sources')
const templatesDb = createLocalCollection<WorkoutTemplate>('ironlog:local:templates')
const templateExercisesDb = createLocalCollection<TemplateExercise>(
  'ironlog:local:template-exercises',
)
const programsDb = createLocalCollection<Program>('ironlog:local:programs')
const programDaysDb = createLocalCollection<ProgramDay>('ironlog:local:program-days')
const trainingsDb = createLocalCollection<Training>('ironlog:local:trainings')
const trainingExercisesDb = createLocalCollection<TrainingExercise>(
  'ironlog:local:training-exercises',
)
const trainingSetsDb = createLocalCollection<TrainingSet>('ironlog:local:training-sets')
const bodyMeasurementsDb = createLocalCollection<BodyMeasurement>('ironlog:local:body-measurements')
const feedbacksDb = createLocalCollection<LocalFeedback>('ironlog:local:feedbacks')

function nowIso() {
  return new Date().toISOString()
}

function findPreviousMaxWeight(exerciseId: string, excludeTrainingId: string): number | null {
  const current = trainingsDb.get(excludeTrainingId)
  const currentWhen = current ? trainingOccurredAt(current) : nowIso()
  const previousTrainings = trainingsDb
    .list()
    .filter((training) => training.id !== excludeTrainingId && training.status === 'finished')
    .filter((training) => trainingOccurredAt(training) < currentWhen)
    .sort((a, b) => trainingOccurredAt(b).localeCompare(trainingOccurredAt(a)))

  for (const training of previousTrainings) {
    const row = trainingExercisesDb
      .list()
      .find((item) => item.trainingId === training.id && item.exerciseId === exerciseId)
    if (!row) continue
    if (row.maxWeight != null) return row.maxWeight
    const sets = trainingSetsDb.list().filter((set) => set.trainingExerciseId === row.id)
    const max = workingSetMaxWeight(sets, row.isWarmup)
    if (max != null) return max
  }
  return null
}

function snapshotSessionMaxWeights(trainingId: string) {
  const exercises = trainingExercisesDb.list().filter((item) => item.trainingId === trainingId)
  for (const exercise of exercises) {
    const sets = trainingSetsDb.list().filter((set) => set.trainingExerciseId === exercise.id)
    trainingExercisesDb.upsert({
      ...exercise,
      maxWeight: workingSetMaxWeight(sets, exercise.isWarmup),
      previousMaxWeight: exercise.previousMaxWeight ?? null,
    })
  }
}

function refreshPreviousMaxWeights(trainingId: string) {
  const exercises = trainingExercisesDb.list().filter((item) => item.trainingId === trainingId)
  for (const exercise of exercises) {
    const previousMaxWeight = findPreviousMaxWeight(exercise.exerciseId, trainingId)
    if (previousMaxWeight == null) continue
    trainingExercisesDb.upsert({
      ...exercise,
      maxWeight: exercise.maxWeight ?? null,
      previousMaxWeight,
    })
  }
}

export const localData = {
  exercises: {
    list(q?: string) {
      const items = exercisesDb.list()
      if (!q) return items
      const needle = q.toLowerCase()
      return items.filter((item) => item.name.toLowerCase().includes(needle))
    },
    get(id: string) {
      return exercisesDb.get(id)
    },
    create(input: CreateExerciseInput): Exercise {
      const stamp = nowIso()
      return exercisesDb.upsert({
        id: input.id ?? createLocalId(),
        name: input.name,
        description: input.description ?? null,
        muscleGroup: input.muscleGroup ?? null,
        difficulty: input.difficulty ?? null,
        metadata: input.metadata ?? {},
        createdAt: stamp,
        updatedAt: stamp,
      })
    },
    upsert(exercise: Exercise): Exercise {
      return exercisesDb.upsert(exercise)
    },
    update(id: string, input: UpdateExerciseInput): Exercise | null {
      const current = exercisesDb.get(id)
      if (!current) return null
      return exercisesDb.upsert({
        ...current,
        ...input,
        description: input.description === undefined ? current.description : input.description,
        muscleGroup: input.muscleGroup === undefined ? current.muscleGroup : input.muscleGroup,
        difficulty: input.difficulty === undefined ? current.difficulty : input.difficulty,
        metadata: input.metadata === undefined ? current.metadata : input.metadata,
        updatedAt: nowIso(),
      })
    },
    remove(id: string) {
      sourcesDb.save(sourcesDb.list().filter((item) => item.exerciseId !== id))
      return exercisesDb.remove(id)
    },
  },

  sources: {
    listByExercise(exerciseId: string) {
      return sourcesDb
        .list()
        .filter((item) => item.exerciseId === exerciseId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    create(input: CreateSourceInput): ExerciseSource {
      return sourcesDb.upsert({
        id: createLocalId(),
        exerciseId: input.exerciseId,
        type: input.type,
        title: input.title ?? null,
        url: input.url,
        metadata: {},
        createdAt: nowIso(),
      })
    },
    remove(id: string) {
      return sourcesDb.remove(id)
    },
  },

  templates: {
    list(q?: string) {
      const items = templatesDb.list()
      if (!q) return items
      const needle = q.toLowerCase()
      return items.filter((item) => item.name.toLowerCase().includes(needle))
    },
    get(id: string): WorkoutTemplateWithExercises | null {
      const template = templatesDb.get(id)
      if (!template) return null
      const exercises = templateExercisesDb
        .list()
        .filter((item) => item.templateId === id)
        .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
      return { ...template, exercises }
    },
    create(input: CreateTemplateInput): WorkoutTemplate {
      const stamp = nowIso()
      const sync: TrainingSyncMeta =
        (input.metadata?.sync as TrainingSyncMeta | undefined) ?? {
          status: 'pending',
          reason: 'local_mode',
        }
      return templatesDb.upsert({
        id: input.id ?? createLocalId(),
        name: input.name,
        description: input.description ?? null,
        metadata: { ...(input.metadata ?? {}), sync },
        createdAt: stamp,
        updatedAt: stamp,
      })
    },
    upsert(template: WorkoutTemplate): WorkoutTemplate {
      return templatesDb.upsert(template)
    },
    update(
      id: string,
      input: Partial<CreateTemplateInput> & { metadata?: Record<string, unknown> },
    ): WorkoutTemplate | null {
      const current = templatesDb.get(id)
      if (!current) return null
      return templatesDb.upsert({
        ...current,
        name: input.name ?? current.name,
        description:
          input.description === undefined ? current.description : input.description,
        metadata:
          input.metadata === undefined
            ? current.metadata
            : { ...current.metadata, ...input.metadata },
        updatedAt: nowIso(),
      })
    },
    remove(id: string) {
      templateExercisesDb.save(
        templateExercisesDb.list().filter((item) => item.templateId !== id),
      )
      return templatesDb.remove(id)
    },
    addExercise(templateId: string, input: CreateTemplateExerciseInput): TemplateExercise | null {
      if (!templatesDb.get(templateId)) return null
      return templateExercisesDb.upsert({
        id: input.id ?? createLocalId(),
        templateId,
        exerciseId: input.exerciseId,
        exerciseOrder: input.exerciseOrder,
        targetSets: input.targetSets,
        isWarmup: input.isWarmup ?? false,
        minReps: input.minReps ?? null,
        maxReps: input.maxReps ?? null,
        targetWeight: input.targetWeight ?? null,
        restSeconds: input.restSeconds ?? null,
        notes: input.notes ?? null,
        metadata: input.metadata ?? {},
      })
    },
    upsertExercise(exercise: TemplateExercise): TemplateExercise {
      return templateExercisesDb.upsert(exercise)
    },
    updateExercise(
      exerciseRowId: string,
      input: UpdateTemplateExerciseInput,
    ): TemplateExercise | null {
      const current = templateExercisesDb.get(exerciseRowId)
      if (!current) return null
      return templateExercisesDb.upsert({
        ...current,
        ...input,
        isWarmup: input.isWarmup === undefined ? current.isWarmup : input.isWarmup,
        minReps: input.minReps === undefined ? current.minReps : input.minReps,
        maxReps: input.maxReps === undefined ? current.maxReps : input.maxReps,
        targetWeight: input.targetWeight === undefined ? current.targetWeight : input.targetWeight,
        restSeconds: input.restSeconds === undefined ? current.restSeconds : input.restSeconds,
        notes: input.notes === undefined ? current.notes : input.notes,
      })
    },
    removeExercise(exerciseRowId: string) {
      return templateExercisesDb.remove(exerciseRowId)
    },
  },

  programs: {
    list() {
      return programsDb.list()
    },
    get(id: string): ProgramWithDays | null {
      const program = programsDb.get(id)
      if (!program) return null
      const days = programDaysDb
        .list()
        .filter((item) => item.programId === id)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.slotOrder - b.slotOrder)
      return { ...program, days }
    },
    create(input: CreateProgramInput): Program {
      const stamp = nowIso()
      return programsDb.upsert({
        id: createLocalId(),
        name: input.name,
        description: input.description ?? null,
        metadata: {},
        createdAt: stamp,
        updatedAt: stamp,
      })
    },
    remove(id: string) {
      programDaysDb.save(programDaysDb.list().filter((item) => item.programId !== id))
      return programsDb.remove(id)
    },
    addDay(programId: string, input: CreateProgramDayInput): ProgramDay | null {
      if (!programsDb.get(programId)) return null
      return programDaysDb.upsert({
        id: createLocalId(),
        programId,
        dayOfWeek: input.dayOfWeek,
        slotOrder: input.slotOrder,
        templateId: input.templateId ?? null,
        notes: input.notes ?? null,
      })
    },
    updateDay(dayId: string, input: UpdateProgramDayInput): ProgramDay | null {
      const current = programDaysDb.get(dayId)
      if (!current) return null
      return programDaysDb.upsert({
        ...current,
        ...input,
        templateId: input.templateId === undefined ? current.templateId : input.templateId,
        notes: input.notes === undefined ? current.notes : input.notes,
      })
    },
    removeDay(dayId: string) {
      return programDaysDb.remove(dayId)
    },
    apply(programId: string, weekStart: string): { created: Training[]; skipped: number } {
      const program = this.get(programId)
      if (!program) return { created: [], skipped: 0 }
      const created: Training[] = []
      let skipped = 0
      const monday = new Date(`${weekStart}T12:00:00.000Z`)
      for (const day of program.days) {
        if (!day.templateId) continue
        const scheduled = new Date(monday)
        scheduled.setUTCDate(scheduled.getUTCDate() + (day.dayOfWeek - 1))
        const scheduledAt = scheduled.toISOString()
        const dayKey = scheduledAt.slice(0, 10)
        const existingByProgramDay = trainingsDb.list().find(
          (t) => t.programDayId === day.id && t.scheduledAt?.slice(0, 10) === dayKey,
        )
        if (existingByProgramDay) {
          skipped += 1
          continue
        }
        const existingOnDate = trainingsDb.list().find(
          (t) => t.status !== 'cancelled' && t.scheduledAt?.slice(0, 10) === dayKey,
        )
        if (existingOnDate) {
          skipped += 1
          continue
        }
        const training = localData.trainings.create({
          templateId: day.templateId,
          programId: program.id,
          programDayId: day.id,
          status: 'planned',
          scheduledAt,
          notes: day.notes,
        })
        created.push(training)
      }
      return { created, skipped }
    },
  },

  bodyMeasurements: {
    list(from?: string, to?: string) {
      let items = bodyMeasurementsDb.list()
      if (from || to) {
        const fromMs = from ? new Date(from).getTime() : -Infinity
        const toMs = to ? new Date(to).getTime() : Infinity
        items = items.filter((item) => {
          const ms = new Date(item.measuredAt).getTime()
          return ms >= fromMs && ms <= toMs
        })
      }
      return items.sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    },
    create(input: CreateBodyMeasurementInput): BodyMeasurement {
      return bodyMeasurementsDb.upsert({
        id: input.id ?? createLocalId(),
        weight: input.weight,
        measuredAt: input.measuredAt ?? nowIso(),
        metadata: input.metadata ?? {},
      })
    },
    upsert(item: BodyMeasurement): BodyMeasurement {
      return bodyMeasurementsDb.upsert(item)
    },
    remove(id: string) {
      return bodyMeasurementsDb.remove(id)
    },
  },

  feedbacks: {
    list() {
      return feedbacksDb
        .list()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    listPending() {
      return this.list().filter((item) => item.sync.status === 'pending' || item.sync.status === 'error')
    },
    get(id: string) {
      return feedbacksDb.get(id)
    },
    create(
      input: CreateFeedbackInput & { syncStatus?: FeedbackSyncStatus },
    ): LocalFeedback {
      const stamp = nowIso()
      return feedbacksDb.upsert({
        id: input.id ?? createLocalId(),
        userId: null,
        category: input.category,
        message: input.message,
        rating: input.rating ?? null,
        status: 'new',
        clientMeta: input.clientMeta ?? {},
        createdAt: stamp,
        sync: { status: input.syncStatus ?? 'pending' },
      })
    },
    upsert(item: LocalFeedback): LocalFeedback {
      return feedbacksDb.upsert(item)
    },
    markSynced(id: string, patch?: Partial<LocalFeedback>): LocalFeedback | null {
      const current = feedbacksDb.get(id)
      if (!current) return null
      return feedbacksDb.upsert({
        ...current,
        ...patch,
        sync: { status: 'synced' },
      })
    },
    markPending(id: string, reason?: 'network' | 'server' | 'timeout'): LocalFeedback | null {
      const current = feedbacksDb.get(id)
      if (!current) return null
      return feedbacksDb.upsert({
        ...current,
        sync: { status: 'pending', reason },
      })
    },
    markError(id: string, reason?: 'network' | 'server' | 'timeout'): LocalFeedback | null {
      const current = feedbacksDb.get(id)
      if (!current) return null
      return feedbacksDb.upsert({
        ...current,
        sync: { status: 'error', reason },
      })
    },
  },

  stats: {
    volume(from: string, to: string): VolumeStatPoint[] {
      const fromMs = new Date(from).getTime()
      const toMs = new Date(to).getTime()
      const byDate = new Map<string, number>()
      for (const training of trainingsDb.list()) {
        if (training.status !== 'finished' && training.status !== 'in_progress') continue
        const when = training.startedAt ?? training.scheduledAt ?? training.createdAt
        const ms = new Date(when).getTime()
        if (ms < fromMs || ms > toMs) continue
        const key = when.slice(0, 10)
        const exercises = trainingExercisesDb
          .list()
          .filter((e) => e.trainingId === training.id)
        let volume = 0
        for (const exercise of exercises) {
          for (const set of trainingSetsDb
            .list()
            .filter(
              (s) =>
                s.trainingExerciseId === exercise.id &&
                s.completed &&
                !(s.isWarmup ?? false) &&
                !(exercise.isWarmup ?? false),
            )) {
            if (set.weight != null && set.reps != null) volume += set.weight * set.reps
          }
        }
        byDate.set(key, (byDate.get(key) ?? 0) + volume)
      }
      return [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, volume]) => ({ date, volume }))
    },
    exerciseProgress(exerciseId: string, from: string, to: string): ExerciseProgressPoint[] {
      const fromMs = new Date(from).getTime()
      const toMs = new Date(to).getTime()
      const byDate = new Map<string, ExerciseProgressPoint>()
      for (const training of trainingsDb.list()) {
        if (training.status !== 'finished' && training.status !== 'in_progress') continue
        const when = training.startedAt ?? training.scheduledAt ?? training.createdAt
        const ms = new Date(when).getTime()
        if (ms < fromMs || ms > toMs) continue
        const key = when.slice(0, 10)
        const exercises = trainingExercisesDb
          .list()
          .filter((e) => e.trainingId === training.id && e.exerciseId === exerciseId)
        for (const exercise of exercises) {
          const point = byDate.get(key) ?? { date: key, maxWeight: null, bestVolume: 0 }
          for (const set of trainingSetsDb
            .list()
            .filter(
              (s) =>
                s.trainingExerciseId === exercise.id &&
                s.completed &&
                !(s.isWarmup ?? false) &&
                !(exercise.isWarmup ?? false),
            )) {
            if (set.weight != null) {
              point.maxWeight =
                point.maxWeight == null ? set.weight : Math.max(point.maxWeight, set.weight)
            }
            if (set.weight != null && set.reps != null) {
              point.bestVolume = Math.max(point.bestVolume, set.weight * set.reps)
            }
          }
          byDate.set(key, point)
        }
      }
      return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
    },
  },

  trainings: {
    list(params?: { from?: string; to?: string }) {
      let items = trainingsDb.list()
      if (params?.from || params?.to) {
        const fromMs = params.from ? new Date(params.from).getTime() : -Infinity
        const toMs = params.to ? new Date(params.to).getTime() : Infinity
        items = items.filter((t) => {
          const when = t.scheduledAt ?? t.startedAt ?? t.createdAt
          const ms = new Date(when).getTime()
          return ms >= fromMs && ms <= toMs
        })
      }
      return items
    },
    get(id: string): TrainingWithDetails | null {
      const training = trainingsDb.get(id)
      if (!training) return null
      const exercises = trainingExercisesDb
        .list()
        .filter((item) => item.trainingId === id)
        .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
        .map((exercise) => {
          const sets = trainingSetsDb
            .list()
            .filter((set) => set.trainingExerciseId === exercise.id)
            .sort((a, b) => a.setNumber - b.setNumber)
            .map((set) => ({
              ...set,
              isWarmup: set.isWarmup ?? (exercise.isWarmup ? true : false),
            }))

          return {
            ...exercise,
            isWarmup: exercise.isWarmup ?? false,
            maxWeight:
              exercise.maxWeight !== undefined
                ? exercise.maxWeight
                : training.status === 'finished'
                  ? workingSetMaxWeight(sets, exercise.isWarmup ?? false)
                  : null,
            previousMaxWeight:
              exercise.previousMaxWeight !== undefined
                ? exercise.previousMaxWeight
                : findPreviousMaxWeight(exercise.exerciseId, id),
            sets,
          }
        })
      return { ...training, exercises }
    },
    create(input: CreateTrainingInput): Training {
      const existingSync = input.metadata?.sync as TrainingSyncMeta | undefined
      const sync: TrainingSyncMeta = existingSync ?? {
        status: 'pending',
        reason: 'local_mode',
      }
      const training = trainingsDb.upsert({
        id: input.id ?? createLocalId(),
        templateId: input.templateId ?? null,
        programId: input.programId ?? null,
        programDayId: input.programDayId ?? null,
        status: input.status,
        scheduledAt: input.scheduledAt ?? null,
        startedAt: input.status === 'planned' ? null : (input.startedAt ?? null),
        finishedAt: input.finishedAt ?? null,
        notes: input.notes ?? null,
        metadata: { ...(input.metadata ?? {}), sync },
        createdAt: nowIso(),
      })
      if (input.templateId) {
        const template = localData.templates.get(input.templateId)
        if (template) {
          for (const item of template.exercises) {
            localData.trainings.addExercise(training.id, {
              exerciseId: item.exerciseId,
              exerciseOrder: item.exerciseOrder,
              targetSets: item.targetSets,
              isWarmup: item.isWarmup ?? false,
              minReps: item.minReps,
              maxReps: item.maxReps,
              restSeconds: item.restSeconds,
              notes: item.notes,
              metadata:
                item.targetWeight != null ? { targetWeight: item.targetWeight } : undefined,
            })
          }
        }
      }
      return training
    },
    upsert(training: Training): Training {
      return trainingsDb.upsert(training)
    },
    update(id: string, input: Partial<CreateTrainingInput> & { status?: Training['status'] }) {
      const current = trainingsDb.get(id)
      if (!current) return null
      const nextStatus = input.status ?? current.status
      let startedAt = input.startedAt === undefined ? current.startedAt : input.startedAt
      if (nextStatus === 'in_progress' && !startedAt) {
        startedAt = nowIso()
      }
      const metadata =
        input.metadata === undefined
          ? current.metadata
          : { ...current.metadata, ...input.metadata }
      const updated = trainingsDb.upsert({
        ...current,
        ...input,
        status: nextStatus,
        startedAt: startedAt ?? null,
        scheduledAt:
          input.scheduledAt === undefined ? current.scheduledAt : input.scheduledAt,
        finishedAt: input.finishedAt === undefined ? current.finishedAt : input.finishedAt,
        metadata,
      })
      if (nextStatus === 'in_progress' && current.status !== 'in_progress') {
        refreshPreviousMaxWeights(id)
      }
      if (nextStatus === 'finished' && current.status !== 'finished') {
        snapshotSessionMaxWeights(id)
      }
      return updated
    },
    finish(id: string): Training | null {
      const current = trainingsDb.get(id)
      if (!current) return null
      snapshotSessionMaxWeights(id)
      return trainingsDb.upsert({
        ...current,
        status: 'finished',
        finishedAt: nowIso(),
        startedAt: current.startedAt ?? nowIso(),
      })
    },
    remove(id: string) {
      const exerciseIds = trainingExercisesDb
        .list()
        .filter((item) => item.trainingId === id)
        .map((item) => item.id)
      trainingSetsDb.save(
        trainingSetsDb.list().filter((set) => !exerciseIds.includes(set.trainingExerciseId)),
      )
      trainingExercisesDb.save(
        trainingExercisesDb.list().filter((item) => item.trainingId !== id),
      )
      return trainingsDb.remove(id)
    },
    addExercise(
      trainingId: string,
      input: CreateTrainingExerciseInput,
    ): TrainingExercise | null {
      if (!trainingsDb.get(trainingId)) return null
      return trainingExercisesDb.upsert({
        id: input.id ?? createLocalId(),
        trainingId,
        exerciseId: input.exerciseId,
        exerciseOrder: input.exerciseOrder,
        targetSets: input.targetSets,
        isWarmup: input.isWarmup ?? false,
        minReps: input.minReps ?? null,
        maxReps: input.maxReps ?? null,
        maxWeight: input.maxWeight ?? null,
        previousMaxWeight:
          input.previousMaxWeight ?? findPreviousMaxWeight(input.exerciseId, trainingId),
        restSeconds: input.restSeconds ?? null,
        notes: input.notes ?? null,
        metadata: input.metadata ?? {},
      })
    },
    upsertExercise(exercise: TrainingExercise): TrainingExercise {
      return trainingExercisesDb.upsert(exercise)
    },
    updateExercise(
      exerciseRowId: string,
      input: UpdateTrainingExerciseInput,
    ): TrainingExercise | null {
      const current = trainingExercisesDb.get(exerciseRowId)
      if (!current) return null
      let metadata = { ...current.metadata }
      if (input.targetWeight !== undefined) {
        if (input.targetWeight == null) {
          delete metadata.targetWeight
        } else {
          metadata = { ...metadata, targetWeight: input.targetWeight }
        }
      }
      if (input.metadata !== undefined) {
        metadata = { ...metadata, ...input.metadata }
      }
      return trainingExercisesDb.upsert({
        ...current,
        exerciseOrder: input.exerciseOrder ?? current.exerciseOrder,
        targetSets: input.targetSets ?? current.targetSets,
        isWarmup: input.isWarmup === undefined ? current.isWarmup : input.isWarmup,
        minReps: input.minReps === undefined ? current.minReps : input.minReps,
        maxReps: input.maxReps === undefined ? current.maxReps : input.maxReps,
        maxWeight: input.maxWeight === undefined ? (current.maxWeight ?? null) : input.maxWeight,
        previousMaxWeight:
          input.previousMaxWeight === undefined
            ? (current.previousMaxWeight ?? null)
            : input.previousMaxWeight,
        restSeconds: input.restSeconds === undefined ? current.restSeconds : input.restSeconds,
        notes: input.notes === undefined ? current.notes : input.notes,
        metadata,
      })
    },
    removeExercise(exerciseRowId: string) {
      trainingSetsDb.save(
        trainingSetsDb.list().filter((set) => set.trainingExerciseId !== exerciseRowId),
      )
      return trainingExercisesDb.remove(exerciseRowId)
    },
    addSet(
      exerciseId: string,
      input: CreateTrainingSetInput,
    ): TrainingSet | null {
      if (!trainingExercisesDb.get(exerciseId)) return null
      return trainingSetsDb.upsert({
        id: input.id ?? createLocalId(),
        trainingExerciseId: exerciseId,
        setNumber: input.setNumber,
        weight: input.weight ?? null,
        reps: input.reps ?? null,
        rir: input.rir ?? null,
        rpe: input.rpe ?? null,
        completed: input.completed ?? true,
        isWarmup: input.isWarmup ?? false,
        metadata: input.metadata ?? {},
        createdAt: nowIso(),
      })
    },
    upsertSet(set: TrainingSet): TrainingSet {
      return trainingSetsDb.upsert(set)
    },
    updateSet(
      setId: string,
      input: Partial<CreateTrainingSetInput>,
    ): TrainingSet | null {
      const current = trainingSetsDb.get(setId)
      if (!current) return null
      return trainingSetsDb.upsert({
        ...current,
        setNumber: input.setNumber ?? current.setNumber,
        weight: input.weight === undefined ? current.weight : input.weight,
        reps: input.reps === undefined ? current.reps : input.reps,
        rir: input.rir === undefined ? current.rir : input.rir,
        rpe: input.rpe === undefined ? current.rpe : input.rpe,
        completed: input.completed === undefined ? current.completed : input.completed,
        isWarmup: input.isWarmup === undefined ? (current.isWarmup ?? false) : input.isWarmup,
        metadata: input.metadata === undefined ? current.metadata : input.metadata,
      })
    },
    removeSet(setId: string) {
      return trainingSetsDb.remove(setId)
    },
  },
}

export const LOCAL_STORAGE_KEYS = [
  'ironlog:local:exercises',
  'ironlog:local:sources',
  'ironlog:local:templates',
  'ironlog:local:template-exercises',
  'ironlog:local:programs',
  'ironlog:local:program-days',
  'ironlog:local:trainings',
  'ironlog:local:training-exercises',
  'ironlog:local:training-sets',
  'ironlog:local:body-measurements',
  'ironlog:local:feedbacks',
  'ironlog:local:catalog-outbox',
  'ironlog:local:entity-delete-outbox',
] as const

export function clearAllLocalData() {
  if (typeof window === 'undefined') return
  for (const key of LOCAL_STORAGE_KEYS) {
    localStorage.removeItem(key)
  }
}
