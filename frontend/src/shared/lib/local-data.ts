import { createLocalCollection } from '@/shared/lib/local-db'
import { createLocalId } from '@/shared/lib/local-id'

import type {
  CreateExerciseInput,
  Exercise,
  UpdateExerciseInput,
} from '@/entities/exercise/model/types'
import type {
  CreateEquipmentInput,
  Equipment,
} from '@/entities/equipment/model/types'
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
  TrainingWithDetails,
} from '@/entities/training/model/types'
import type {
  ExerciseProgressPoint,
  VolumeStatPoint,
} from '@/entities/stats/model/types'

const exercisesDb = createLocalCollection<Exercise>('ironlog:local:exercises')
const equipmentDb = createLocalCollection<Equipment>('ironlog:local:equipment')
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

function nowIso() {
  return new Date().toISOString()
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
        id: createLocalId(),
        name: input.name,
        description: input.description ?? null,
        muscleGroup: input.muscleGroup ?? null,
        equipment: input.equipment ?? null,
        difficulty: input.difficulty ?? null,
        metadata: {},
        createdAt: stamp,
        updatedAt: stamp,
      })
    },
    update(id: string, input: UpdateExerciseInput): Exercise | null {
      const current = exercisesDb.get(id)
      if (!current) return null
      return exercisesDb.upsert({
        ...current,
        ...input,
        description: input.description === undefined ? current.description : input.description,
        muscleGroup: input.muscleGroup === undefined ? current.muscleGroup : input.muscleGroup,
        equipment: input.equipment === undefined ? current.equipment : input.equipment,
        difficulty: input.difficulty === undefined ? current.difficulty : input.difficulty,
        metadata: input.metadata === undefined ? current.metadata : input.metadata,
        updatedAt: nowIso(),
      })
    },
    remove(id: string) {
      return exercisesDb.remove(id)
    },
  },

  equipment: {
    list() {
      return equipmentDb.list().sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    },
    create(input: CreateEquipmentInput): Equipment {
      const stamp = nowIso()
      return equipmentDb.upsert({
        id: createLocalId(),
        name: input.name.trim(),
        metadata: {},
        createdAt: stamp,
        updatedAt: stamp,
      })
    },
    remove(id: string) {
      return equipmentDb.remove(id)
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
      return templatesDb.upsert({
        id: createLocalId(),
        name: input.name,
        description: input.description ?? null,
        metadata: {},
        createdAt: stamp,
        updatedAt: stamp,
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
        id: createLocalId(),
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
        metadata: {},
      })
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
        const existing = trainingsDb.list().find(
          (t) =>
            t.programDayId === day.id &&
            t.status !== 'cancelled' &&
            t.scheduledAt?.slice(0, 10) === scheduledAt.slice(0, 10),
        )
        if (existing) {
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
          .filter((e) => e.trainingId === training.id && !e.isWarmup)
        let volume = 0
        for (const exercise of exercises) {
          for (const set of trainingSetsDb
            .list()
            .filter((s) => s.trainingExerciseId === exercise.id && s.completed)) {
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
          .filter((e) => e.trainingId === training.id && e.exerciseId === exerciseId && !e.isWarmup)
        for (const exercise of exercises) {
          const point = byDate.get(key) ?? { date: key, maxWeight: null, bestVolume: 0 }
          for (const set of trainingSetsDb
            .list()
            .filter((s) => s.trainingExerciseId === exercise.id && s.completed)) {
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
        .map((exercise) => ({
          ...exercise,
          isWarmup: exercise.isWarmup ?? false,
          sets: trainingSetsDb
            .list()
            .filter((set) => set.trainingExerciseId === exercise.id)
            .sort((a, b) => a.setNumber - b.setNumber),
        }))
      return { ...training, exercises }
    },
    create(input: CreateTrainingInput): Training {
      const training = trainingsDb.upsert({
        id: createLocalId(),
        templateId: input.templateId ?? null,
        programId: input.programId ?? null,
        programDayId: input.programDayId ?? null,
        status: input.status,
        scheduledAt: input.scheduledAt ?? null,
        startedAt: input.status === 'planned' ? null : (input.startedAt ?? null),
        finishedAt: input.finishedAt ?? null,
        notes: input.notes ?? null,
        metadata: {},
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
    update(id: string, input: Partial<CreateTrainingInput> & { status?: Training['status'] }) {
      const current = trainingsDb.get(id)
      if (!current) return null
      const nextStatus = input.status ?? current.status
      let startedAt = input.startedAt === undefined ? current.startedAt : input.startedAt
      if (nextStatus === 'in_progress' && !startedAt) {
        startedAt = nowIso()
      }
      return trainingsDb.upsert({
        ...current,
        ...input,
        status: nextStatus,
        startedAt: startedAt ?? null,
        scheduledAt:
          input.scheduledAt === undefined ? current.scheduledAt : input.scheduledAt,
        finishedAt: input.finishedAt === undefined ? current.finishedAt : input.finishedAt,
      })
    },
    finish(id: string): Training | null {
      const current = trainingsDb.get(id)
      if (!current) return null
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
        id: createLocalId(),
        trainingId,
        exerciseId: input.exerciseId,
        exerciseOrder: input.exerciseOrder,
        targetSets: input.targetSets,
        isWarmup: input.isWarmup ?? false,
        minReps: input.minReps ?? null,
        maxReps: input.maxReps ?? null,
        restSeconds: input.restSeconds ?? null,
        notes: input.notes ?? null,
        metadata: input.metadata ?? {},
      })
    },
    addSet(
      exerciseId: string,
      input: CreateTrainingSetInput,
    ): TrainingSet | null {
      if (!trainingExercisesDb.get(exerciseId)) return null
      return trainingSetsDb.upsert({
        id: createLocalId(),
        trainingExerciseId: exerciseId,
        setNumber: input.setNumber,
        weight: input.weight ?? null,
        reps: input.reps ?? null,
        rir: input.rir ?? null,
        rpe: input.rpe ?? null,
        completed: input.completed ?? true,
        metadata: {},
        createdAt: nowIso(),
      })
    },
    removeSet(setId: string) {
      return trainingSetsDb.remove(setId)
    },
  },
}
