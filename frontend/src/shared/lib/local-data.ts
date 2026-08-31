import {
  areExerciseOrdersContiguous,
  groupTypeFromMemberCount,
} from '@/entities/session/lib/exercise-group-utils'
import { createLocalCollection } from '@/shared/lib/local-db'
import { createLocalId } from '@/shared/lib/local-id'
import {
  clearCurrentScopeData,
  LEGACY_LOCAL_STORAGE_KEYS,
  scopedStorageKey,
  SCOPED_DATA_SUFFIXES,
} from '@/shared/lib/storage-scope'

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
  CreateTimecodeInput,
  ExerciseSource,
  ExerciseTimecode,
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
  CreateTemplateExerciseGroupInput,
  CreateTemplateExerciseInput,
  CreateTemplateInput,
  TemplateExercise,
  TemplateExerciseGroup,
  UpdateTemplateExerciseGroupInput,
  UpdateTemplateExerciseInput,
  WorkoutTemplate,
  WorkoutTemplateWithExercises,
} from '@/entities/template/model/types'
import type {
  CreateTrainingExerciseGroupInput,
  CreateTrainingExerciseInput,
  CreateTrainingInput,
  CreateTrainingSetInput,
  Training,
  TrainingExercise,
  TrainingExerciseGroup,
  TrainingSet,
  TrainingSyncMeta,
  TrainingWithDetails,
  UpdateTrainingExerciseGroupInput,
  UpdateTrainingExerciseInput,
} from '@/entities/training/model/types'
import type {
  ActivityStatPoint,
  ExerciseProgressPoint,
  MuscleGroupStatPoint,
  StrengthCorrelationPoint,
  VolumeStatPoint,
} from '@/entities/stats/model/types'
import { aggregateMuscleGroupRows } from '@/entities/exercise/model/muscle-groups'
import {
  trainingOccurredAt,
  workingSetMaxWeight,
} from '@/entities/training/lib/session-weight'

const exercisesDb = createLocalCollection<Exercise>('exercises')
const sourcesDb = createLocalCollection<ExerciseSource>('sources')
const timecodesDb = createLocalCollection<ExerciseTimecode>('timecodes')
const templatesDb = createLocalCollection<WorkoutTemplate>('templates')
const templateExercisesDb = createLocalCollection<TemplateExercise>('template-exercises')
const templateGroupsDb = createLocalCollection<TemplateExerciseGroup>('template-groups')
const programsDb = createLocalCollection<Program>('programs')
const programDaysDb = createLocalCollection<ProgramDay>('program-days')
const trainingsDb = createLocalCollection<Training>('trainings')
const trainingExercisesDb = createLocalCollection<TrainingExercise>('training-exercises')
const trainingGroupsDb = createLocalCollection<TrainingExerciseGroup>('training-groups')
const trainingSetsDb = createLocalCollection<TrainingSet>('training-sets')
const bodyMeasurementsDb = createLocalCollection<BodyMeasurement>('body-measurements')
const feedbacksDb = createLocalCollection<LocalFeedback>('feedbacks')

function normalizeTemplateExercise(exercise: TemplateExercise): TemplateExercise {
  return {
    ...exercise,
    groupId: exercise.groupId ?? null,
    positionInGroup: exercise.positionInGroup ?? null,
  }
}

function normalizeTrainingExercise(exercise: TrainingExercise): TrainingExercise {
  return {
    ...exercise,
    groupId: exercise.groupId ?? null,
    positionInGroup: exercise.positionInGroup ?? null,
  }
}

function copyTemplateStructureToTrainingLocal(template: WorkoutTemplateWithExercises, trainingId: string) {
  const alreadyHasExercises = trainingExercisesDb
    .list()
    .some((item) => item.trainingId === trainingId)
  if (alreadyHasExercises) return

  const exerciseIdMap = new Map<string, string>()

  for (const item of [...template.exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)) {
    const created = localData.trainings.addExercise(trainingId, {
      exerciseId: item.exerciseId,
      exerciseOrder: item.exerciseOrder,
      targetSets: item.targetSets,
      isWarmup: item.isWarmup ?? false,
      minReps: item.minReps,
      maxReps: item.maxReps,
      restSeconds: item.restSeconds,
      notes: item.notes,
      metadata:
        item.targetWeight != null ? { targetWeight: item.targetWeight } : item.metadata,
    })
    if (created) exerciseIdMap.set(item.id, created.id)
  }

  for (const group of [...(template.groups ?? [])].sort((a, b) => a.groupOrder - b.groupOrder)) {
    const members = template.exercises
      .filter((item) => item.groupId === group.id)
      .sort((a, b) => (a.positionInGroup ?? 0) - (b.positionInGroup ?? 0))
    if (members.length < 2) continue
    const mappedIds = members
      .map((member) => exerciseIdMap.get(member.id))
      .filter((memberId): memberId is string => Boolean(memberId))
    if (mappedIds.length !== members.length) continue
    localData.trainings.createGroup(trainingId, {
      exerciseIds: mappedIds,
      type: group.type,
      restSeconds: group.restSeconds,
    })
  }
}

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
        userId: null,
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
      const { isSystem: _isSystem, ...fields } = input
      return exercisesDb.upsert({
        ...current,
        ...fields,
        userId: input.isSystem === true ? null : current.userId,
        description: input.description === undefined ? current.description : input.description,
        muscleGroup: input.muscleGroup === undefined ? current.muscleGroup : input.muscleGroup,
        difficulty: input.difficulty === undefined ? current.difficulty : input.difficulty,
        metadata: input.metadata === undefined ? current.metadata : input.metadata,
        updatedAt: nowIso(),
      })
    },
    remove(id: string) {
      const sourceIds = sourcesDb
        .list()
        .filter((item) => item.exerciseId === id)
        .map((item) => item.id)
      sourcesDb.save(sourcesDb.list().filter((item) => item.exerciseId !== id))
      timecodesDb.save(timecodesDb.list().filter((item) => !sourceIds.includes(item.sourceId)))
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
      timecodesDb.save(timecodesDb.list().filter((item) => item.sourceId !== id))
      return sourcesDb.remove(id)
    },
  },

  timecodes: {
    listBySource(sourceId: string) {
      return timecodesDb
        .list()
        .filter((item) => item.sourceId === sourceId)
        .sort((a, b) => a.seconds - b.seconds)
    },
    create(input: CreateTimecodeInput & { sourceId: string }): ExerciseTimecode {
      return timecodesDb.upsert({
        id: createLocalId(),
        sourceId: input.sourceId,
        seconds: input.seconds,
        title: input.title ?? null,
        metadata: {},
      })
    },
    remove(id: string) {
      return timecodesDb.remove(id)
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
        .map(normalizeTemplateExercise)
      const groups = templateGroupsDb
        .list()
        .filter((item) => item.templateId === id)
        .sort((a, b) => a.groupOrder - b.groupOrder)
      return { ...template, exercises, groups }
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
      templateGroupsDb.save(templateGroupsDb.list().filter((item) => item.templateId !== id))
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
        groupId: input.groupId ?? null,
        positionInGroup: input.positionInGroup ?? null,
        metadata: input.metadata ?? {},
      })
    },
    upsertExercise(exercise: TemplateExercise): TemplateExercise {
      return templateExercisesDb.upsert(exercise)
    },
    upsertGroup(group: TemplateExerciseGroup): TemplateExerciseGroup {
      return templateGroupsDb.upsert(group)
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
        groupId: input.groupId === undefined ? current.groupId : input.groupId,
        positionInGroup:
          input.positionInGroup === undefined ? current.positionInGroup : input.positionInGroup,
      })
    },
    removeExercise(exerciseRowId: string) {
      const current = templateExercisesDb.get(exerciseRowId)
      if (current?.groupId) {
        const groupId = current.groupId
        for (const partner of templateExercisesDb.list().filter((item) => item.groupId === groupId)) {
          if (partner.id === exerciseRowId) continue
          templateExercisesDb.upsert({ ...partner, groupId: null, positionInGroup: null })
        }
        templateGroupsDb.remove(groupId)
      }
      return templateExercisesDb.remove(exerciseRowId)
    },
    createGroup(
      templateId: string,
      input: CreateTemplateExerciseGroupInput,
    ): TemplateExerciseGroup | null {
      if (!templatesDb.get(templateId)) return null

      const resolved = input.exerciseIds.map((id) => templateExercisesDb.get(id))
      if (resolved.some((item) => !item)) return null

      const exercises = resolved.filter((item): item is TemplateExercise => item != null)
      if (exercises.some((item) => item.templateId !== templateId)) return null
      if (exercises.some((item) => item.groupId)) return null

      const orders = exercises.map((item) => item.exerciseOrder)
      if (!areExerciseOrdersContiguous(orders)) return null

      const sorted = [...exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)
      const syncedTargetSets = Math.max(...sorted.map((item) => item.targetSets))
      const groupOrder = Math.min(...orders)
      const memberCount = sorted.length

      const group = templateGroupsDb.upsert({
        id: input.id ?? createLocalId(),
        templateId,
        type: input.type ?? groupTypeFromMemberCount(memberCount),
        groupOrder,
        restSeconds: input.restSeconds ?? null,
        metadata: {},
      })

      sorted.forEach((exercise, index) => {
        templateExercisesDb.upsert({
          ...exercise,
          groupId: group.id,
          positionInGroup: index,
          targetSets: syncedTargetSets,
        })
      })

      return group
    },
    addExerciseToGroup(
      groupId: string,
      exerciseId: string,
    ): TemplateExerciseGroup | null {
      const group = templateGroupsDb.get(groupId)
      const exercise = templateExercisesDb.get(exerciseId)
      if (!group || !exercise || exercise.templateId !== group.templateId) return null
      if (exercise.groupId === groupId) return group
      if (exercise.groupId) return null

      const members = templateExercisesDb
        .list()
        .filter((item) => item.groupId === groupId)
        .sort((a, b) => (a.positionInGroup ?? 0) - (b.positionInGroup ?? 0))
      const maxOrder = Math.max(...members.map((item) => item.exerciseOrder))
      if (exercise.exerciseOrder !== maxOrder + 1) return null

      const syncedTargetSets = Math.max(...members.map((item) => item.targetSets), exercise.targetSets)
      templateExercisesDb.upsert({
        ...exercise,
        groupId: group.id,
        positionInGroup: members.length,
        targetSets: syncedTargetSets,
      })
      for (const member of members) {
        templateExercisesDb.upsert({ ...member, targetSets: syncedTargetSets })
      }

      return templateGroupsDb.upsert({
        ...group,
        type: groupTypeFromMemberCount(members.length + 1),
      })
    },
    updateGroup(
      groupId: string,
      input: UpdateTemplateExerciseGroupInput,
    ): TemplateExerciseGroup | null {
      const current = templateGroupsDb.get(groupId)
      if (!current) return null
      return templateGroupsDb.upsert({
        ...current,
        restSeconds: input.restSeconds === undefined ? current.restSeconds : input.restSeconds,
      })
    },
    deleteGroup(groupId: string) {
      for (const member of templateExercisesDb.list().filter((item) => item.groupId === groupId)) {
        templateExercisesDb.upsert({ ...member, groupId: null, positionInGroup: null })
      }
      return templateGroupsDb.remove(groupId)
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
    remove(id: string) {
      return feedbacksDb.remove(id)
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
    muscleGroups(from: string, to: string): MuscleGroupStatPoint[] {
      const fromMs = new Date(from).getTime()
      const toMs = new Date(to).getTime()
      const rows: Array<{ muscleGroupRaw: string; volume: number; sets: number }> = []

      for (const training of trainingsDb.list()) {
        if (training.status !== 'finished' && training.status !== 'in_progress') continue
        const when = training.startedAt ?? training.scheduledAt ?? training.createdAt
        const ms = new Date(when).getTime()
        if (ms < fromMs || ms > toMs) continue

        const exercises = trainingExercisesDb.list().filter((e) => e.trainingId === training.id)
        for (const exercise of exercises) {
          const meta = exercisesDb.get(exercise.exerciseId)
          let volume = 0
          let sets = 0
          for (const set of trainingSetsDb.list().filter(
            (s) =>
              s.trainingExerciseId === exercise.id &&
              s.completed &&
              !(s.isWarmup ?? false) &&
              !(exercise.isWarmup ?? false),
          )) {
            if (set.weight != null && set.reps != null) {
              volume += set.weight * set.reps
              sets += 1
            }
          }
          if (volume > 0 || sets > 0) {
            rows.push({
              muscleGroupRaw: meta?.muscleGroup ?? '',
              volume,
              sets,
            })
          }
        }
      }

      return aggregateMuscleGroupRows(rows)
    },
    activity(from: string, to: string): ActivityStatPoint[] {
      const fromMs = new Date(from).getTime()
      const toMs = new Date(to).getTime()
      const byDate = new Map<string, ActivityStatPoint>()

      for (const training of trainingsDb.list()) {
        if (training.status !== 'finished' && training.status !== 'in_progress') continue
        const when = training.startedAt ?? training.scheduledAt ?? training.createdAt
        const ms = new Date(when).getTime()
        if (ms < fromMs || ms > toMs) continue
        const key = when.slice(0, 10)
        const point = byDate.get(key) ?? { date: key, sessionCount: 0, volume: 0 }
        point.sessionCount += 1

        const exercises = trainingExercisesDb.list().filter((e) => e.trainingId === training.id)
        for (const exercise of exercises) {
          for (const set of trainingSetsDb.list().filter(
            (s) =>
              s.trainingExerciseId === exercise.id &&
              s.completed &&
              !(s.isWarmup ?? false) &&
              !(exercise.isWarmup ?? false),
          )) {
            if (set.weight != null && set.reps != null) {
              point.volume += set.weight * set.reps
            }
          }
        }
        byDate.set(key, point)
      }

      return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
    },
    strengthCorrelation(
      exerciseId: string,
      from: string,
      to: string,
    ): StrengthCorrelationPoint[] {
      const progress = localData.stats.exerciseProgress(exerciseId, from, to)
      const measurements = localData.bodyMeasurements.list(from, to)
      const byDate = new Map<string, { measuredAt: string; weight: number }>()
      for (const item of measurements) {
        const date = item.measuredAt.slice(0, 10)
        const current = byDate.get(date)
        if (!current || item.measuredAt.localeCompare(current.measuredAt) > 0) {
          byDate.set(date, { measuredAt: item.measuredAt, weight: item.weight })
        }
      }
      const weightByDay = new Map([...byDate.entries()].map(([date, item]) => [date, item.weight]))

      const dates = new Set<string>([
        ...progress.map((p) => p.date),
        ...weightByDay.keys(),
      ])
      const progressByDate = new Map(progress.map((p) => [p.date, p]))
      let lastWeight: number | null = null

      return [...dates]
        .sort()
        .map((date) => {
          const dayWeight = weightByDay.get(date)
          if (dayWeight != null) lastWeight = dayWeight
          const exercise = progressByDate.get(date)
          return {
            date,
            bodyWeight: lastWeight,
            maxWeight: exercise?.maxWeight ?? null,
            volume: exercise?.bestVolume ?? 0,
          }
        })
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
            ...normalizeTrainingExercise(exercise),
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
      const groups = trainingGroupsDb
        .list()
        .filter((item) => item.trainingId === id)
        .sort((a, b) => a.groupOrder - b.groupOrder)
      return { ...training, exercises, groups }
    },
    replaceDetails(training: TrainingWithDetails) {
      const keepExerciseIds = new Set(training.exercises.map((item) => item.id))
      const keepSetIds = new Set(
        training.exercises.flatMap((item) => item.sets.map((set) => set.id)),
      )
      const keepGroupIds = new Set((training.groups ?? []).map((item) => item.id))

      for (const exercise of trainingExercisesDb
        .list()
        .filter((item) => item.trainingId === training.id)) {
        if (!keepExerciseIds.has(exercise.id)) {
          trainingExercisesDb.remove(exercise.id)
        }
      }

      trainingSetsDb.save(
        trainingSetsDb.list().filter((set) => {
          if (keepSetIds.has(set.id)) return true
          if (keepExerciseIds.has(set.trainingExerciseId)) return false
          const owner = trainingExercisesDb.get(set.trainingExerciseId)
          return owner != null && owner.trainingId !== training.id
        }),
      )

      for (const group of trainingGroupsDb
        .list()
        .filter((item) => item.trainingId === training.id)) {
        if (!keepGroupIds.has(group.id)) {
          trainingGroupsDb.remove(group.id)
        }
      }
    },
    dedupeExercises(trainingId: string): string[] {
      const exercises = trainingExercisesDb
        .list()
        .filter((item) => item.trainingId === trainingId)
      const byKey = new Map<string, TrainingExercise[]>()
      for (const exercise of exercises) {
        const key = `${exercise.exerciseId}:${exercise.exerciseOrder}`
        const bucket = byKey.get(key) ?? []
        bucket.push(exercise)
        byKey.set(key, bucket)
      }

      const removed: string[] = []
      for (const bucket of byKey.values()) {
        if (bucket.length < 2) continue
        const ranked = [...bucket].sort((a, b) => {
          const setsA = trainingSetsDb
            .list()
            .filter((set) => set.trainingExerciseId === a.id).length
          const setsB = trainingSetsDb
            .list()
            .filter((set) => set.trainingExerciseId === b.id).length
          if (setsB !== setsA) return setsB - setsA
          if (Boolean(a.groupId) !== Boolean(b.groupId)) return a.groupId ? -1 : 1
          return a.id.localeCompare(b.id)
        })
        for (const extra of ranked.slice(1)) {
          trainingSetsDb.save(
            trainingSetsDb.list().filter((set) => set.trainingExerciseId !== extra.id),
          )
          trainingExercisesDb.remove(extra.id)
          removed.push(extra.id)
        }
      }
      return removed
    },
    create(
      input: CreateTrainingInput,
      options?: { skipTemplateCopy?: boolean },
    ): Training {
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
      if (input.templateId && !options?.skipTemplateCopy) {
        const template = localData.templates.get(input.templateId)
        if (template) {
          copyTemplateStructureToTrainingLocal(template, training.id)
        }
      }
      return training
    },
    hydrateFromTemplate(
      trainingId: string,
      template: WorkoutTemplateWithExercises,
    ): TrainingWithDetails | null {
      const training = this.get(trainingId)
      if (!training || training.exercises.length > 0 || template.exercises.length === 0) {
        return training
      }
      copyTemplateStructureToTrainingLocal(template, trainingId)
      return this.get(trainingId)
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
      trainingGroupsDb.save(trainingGroupsDb.list().filter((item) => item.trainingId !== id))
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
        groupId: input.groupId ?? null,
        positionInGroup: input.positionInGroup ?? null,
        metadata: input.metadata ?? {},
      })
    },
    upsertExercise(exercise: TrainingExercise): TrainingExercise {
      return trainingExercisesDb.upsert(exercise)
    },
    upsertGroup(group: TrainingExerciseGroup): TrainingExerciseGroup {
      return trainingGroupsDb.upsert(group)
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
        groupId: input.groupId === undefined ? current.groupId : input.groupId,
        positionInGroup:
          input.positionInGroup === undefined ? current.positionInGroup : input.positionInGroup,
        metadata,
      })
    },
    removeExercise(exerciseRowId: string) {
      const current = trainingExercisesDb.get(exerciseRowId)
      if (current?.groupId) {
        const groupId = current.groupId
        for (const partner of trainingExercisesDb.list().filter((item) => item.groupId === groupId)) {
          if (partner.id === exerciseRowId) continue
          trainingExercisesDb.upsert({ ...partner, groupId: null, positionInGroup: null })
        }
        trainingGroupsDb.remove(groupId)
      }
      trainingSetsDb.save(
        trainingSetsDb.list().filter((set) => set.trainingExerciseId !== exerciseRowId),
      )
      return trainingExercisesDb.remove(exerciseRowId)
    },
    createGroup(
      trainingId: string,
      input: CreateTrainingExerciseGroupInput,
    ): TrainingExerciseGroup | null {
      if (!trainingsDb.get(trainingId)) return null

      const resolved = input.exerciseIds.map((id) => trainingExercisesDb.get(id))
      if (resolved.some((item) => !item)) return null

      const exercises = resolved.filter((item): item is TrainingExercise => item != null)
      if (exercises.some((item) => item.trainingId !== trainingId)) return null
      if (exercises.some((item) => item.groupId)) return null

      const orders = exercises.map((item) => item.exerciseOrder)
      if (!areExerciseOrdersContiguous(orders)) return null

      const sorted = [...exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)
      const syncedTargetSets = Math.max(...sorted.map((item) => item.targetSets))
      const groupOrder = Math.min(...orders)
      const memberCount = sorted.length

      const group = trainingGroupsDb.upsert({
        id: input.id ?? createLocalId(),
        trainingId,
        type: input.type ?? groupTypeFromMemberCount(memberCount),
        groupOrder,
        restSeconds: input.restSeconds ?? null,
        metadata: {},
      })

      sorted.forEach((exercise, index) => {
        trainingExercisesDb.upsert({
          ...exercise,
          groupId: group.id,
          positionInGroup: index,
          targetSets: syncedTargetSets,
        })
      })

      return group
    },
    addExerciseToGroup(
      groupId: string,
      exerciseId: string,
    ): TrainingExerciseGroup | null {
      const group = trainingGroupsDb.get(groupId)
      const exercise = trainingExercisesDb.get(exerciseId)
      if (!group || !exercise || exercise.trainingId !== group.trainingId) return null
      if (exercise.groupId === groupId) return group
      if (exercise.groupId) return null

      const members = trainingExercisesDb
        .list()
        .filter((item) => item.groupId === groupId)
        .sort((a, b) => (a.positionInGroup ?? 0) - (b.positionInGroup ?? 0))
      const maxOrder = Math.max(...members.map((item) => item.exerciseOrder))
      if (exercise.exerciseOrder !== maxOrder + 1) return null

      const syncedTargetSets = Math.max(...members.map((item) => item.targetSets), exercise.targetSets)
      trainingExercisesDb.upsert({
        ...exercise,
        groupId: group.id,
        positionInGroup: members.length,
        targetSets: syncedTargetSets,
      })
      for (const member of members) {
        trainingExercisesDb.upsert({ ...member, targetSets: syncedTargetSets })
      }

      return trainingGroupsDb.upsert({
        ...group,
        type: groupTypeFromMemberCount(members.length + 1),
      })
    },
    updateGroup(
      groupId: string,
      input: UpdateTrainingExerciseGroupInput,
    ): TrainingExerciseGroup | null {
      const current = trainingGroupsDb.get(groupId)
      if (!current) return null
      return trainingGroupsDb.upsert({
        ...current,
        restSeconds: input.restSeconds === undefined ? current.restSeconds : input.restSeconds,
      })
    },
    deleteGroup(groupId: string) {
      for (const member of trainingExercisesDb.list().filter((item) => item.groupId === groupId)) {
        trainingExercisesDb.upsert({ ...member, groupId: null, positionInGroup: null })
      }
      return trainingGroupsDb.remove(groupId)
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

/** @deprecated Prefer scoped keys via scopedStorageKey(); kept for settings UI labels. */
export const LOCAL_STORAGE_KEYS = SCOPED_DATA_SUFFIXES.map((suffix) =>
  scopedStorageKey(suffix),
)

export function clearAllLocalData() {
  clearCurrentScopeData()
  if (typeof window === 'undefined') return
  for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}
