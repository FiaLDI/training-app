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

const exercisesDb = createLocalCollection<Exercise>('ironlog:local:exercises')
const equipmentDb = createLocalCollection<Equipment>('ironlog:local:equipment')
const sourcesDb = createLocalCollection<ExerciseSource>('ironlog:local:sources')
const templatesDb = createLocalCollection<WorkoutTemplate>('ironlog:local:templates')
const templateExercisesDb = createLocalCollection<TemplateExercise>(
  'ironlog:local:template-exercises',
)
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

  trainings: {
    list() {
      return trainingsDb.list()
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
          sets: trainingSetsDb
            .list()
            .filter((set) => set.trainingExerciseId === exercise.id)
            .sort((a, b) => a.setNumber - b.setNumber),
        }))
      return { ...training, exercises }
    },
    create(input: CreateTrainingInput): Training {
      return trainingsDb.upsert({
        id: createLocalId(),
        templateId: input.templateId ?? null,
        status: input.status,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt ?? null,
        notes: input.notes ?? null,
        metadata: {},
        createdAt: nowIso(),
      })
    },
    finish(id: string): Training | null {
      const current = trainingsDb.get(id)
      if (!current) return null
      return trainingsDb.upsert({
        ...current,
        status: 'finished',
        finishedAt: nowIso(),
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
