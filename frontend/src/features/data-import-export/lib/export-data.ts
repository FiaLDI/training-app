import type { BodyMeasurement } from '@/entities/body-measurement/model/types'
import type { Exercise } from '@/entities/exercise/model/types'
import type { ProgramWithDays } from '@/entities/program/model/types'
import type { WorkoutTemplateWithExercises } from '@/entities/template/model/types'
import type { TrainingWithDetails } from '@/entities/training/model/types'
import { localData } from '@/shared/lib/local-data'

import { EXPORT_VERSION } from './types'

export type DataExportBundle = {
  version: typeof EXPORT_VERSION
  exportedAt: string
  app: 'ironlog'
  exercises: Exercise[]
  templates: WorkoutTemplateWithExercises[]
  programs: ProgramWithDays[]
  trainings: TrainingWithDetails[]
  bodyMeasurements: BodyMeasurement[]
}

function stripSyncMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const { sync: _sync, ...rest } = metadata
  return rest
}

function sanitizeTraining(training: TrainingWithDetails): TrainingWithDetails {
  return {
    ...training,
    metadata: stripSyncMetadata(training.metadata ?? {}),
    exercises: training.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({
        ...set,
        metadata: set.metadata ?? {},
      })),
    })),
    groups: training.groups ?? [],
  }
}

export function buildExportBundle(): DataExportBundle {
  const trainings = localData.trainings
    .list()
    .map((training) => localData.trainings.get(training.id))
    .filter((training): training is TrainingWithDetails => training != null)
    .map(sanitizeTraining)

  const templates = localData.templates
    .list()
    .map((template) => localData.templates.get(template.id))
    .filter((template): template is WorkoutTemplateWithExercises => template != null)

  const programs = localData.programs
    .list()
    .map((program) => localData.programs.get(program.id))
    .filter((program): program is ProgramWithDays => program != null)

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'ironlog',
    exercises: localData.exercises.list(),
    templates,
    programs,
    trainings,
    bodyMeasurements: localData.bodyMeasurements.list(),
  }
}

export function exportJsonFile(): void {
  const bundle = buildExportBundle()
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  downloadBlob(blob, `ironlog-export-${dateStamp()}.json`)
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export { downloadBlob }
