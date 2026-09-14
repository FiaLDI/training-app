import { Inject, Injectable } from '@nestjs/common'

import { Exercise } from '../../../exercise/core/types'
import {
  EXERCISE_REPOSITORY_PORT,
  ExerciseRepositoryPort,
} from '../../../exercise/core/ports/exercise-repository.port'
import { TemplateTypeormRepository } from '../../../template/infrastructure/template.typeorm-repository'
import { WorkoutTemplateWithExercises } from '../../../template/core/types'
import { ProgramTypeormRepository } from '../../infrastructure/program.typeorm-repository'
import { ProgramWithDays } from '../types'
import { matchSnapshotExercise } from './match-snapshot-exercise'
import type {
  ProgramSnapshot,
  SharedResource,
  SnapshotExercise,
  SnapshotTemplate,
} from './program-snapshot'

export type InstallResult = {
  skippedExercises: string[]
  template?: WorkoutTemplateWithExercises
  program?: ProgramWithDays
}

@Injectable()
export class InstallSnapshotService {
  constructor(
    private readonly templates: TemplateTypeormRepository,
    private readonly programs: ProgramTypeormRepository,
    @Inject(EXERCISE_REPOSITORY_PORT) private readonly exercises: ExerciseRepositoryPort,
  ) {}

  async snapshotTemplate(templateId: string): Promise<SnapshotTemplate | null> {
    const template = await this.templates.getByIdAny(templateId)
    if (!template) return null
    return this.toTemplateSnapshot(template)
  }

  async snapshotProgram(programId: string): Promise<ProgramSnapshot | null> {
    const program = await this.programs.getByIdAny(programId)
    if (!program) return null

    const days = []
    for (const day of program.days) {
      const template = day.templateId ? await this.templates.getByIdAny(day.templateId) : null
      days.push({
        dayOfWeek: day.dayOfWeek,
        slotOrder: day.slotOrder,
        notes: day.notes,
        template: template ? await this.toTemplateSnapshot(template) : null,
      })
    }

    return {
      name: program.name,
      description: program.description,
      days,
    }
  }

  async installShared(userId: string, resource: SharedResource): Promise<InstallResult> {
    if (resource.kind === 'template') {
      return this.installTemplate(userId, resource.template)
    }
    return this.installProgram(userId, resource.program)
  }

  async installTemplate(userId: string, snapshot: SnapshotTemplate): Promise<InstallResult> {
    const catalog = await this.visibleExercises(userId)
    const { template, skippedExercises } = await this.cloneTemplate(userId, snapshot, catalog)
    const full = await this.templates.getById(template.id, userId)
    return { template: full ?? undefined, skippedExercises }
  }

  async installProgram(userId: string, snapshot: ProgramSnapshot): Promise<InstallResult> {
    const catalog = await this.visibleExercises(userId)
    const skippedExercises: string[] = []

    const program = await this.programs.create({
      userId,
      name: snapshot.name,
      description: snapshot.description,
      metadata: { source: 'install' },
    })

    for (const day of snapshot.days) {
      let templateId: string | null = null
      if (day.template) {
        const cloned = await this.cloneTemplate(userId, day.template, catalog)
        skippedExercises.push(...cloned.skippedExercises)
        templateId = cloned.template.id
      }
      await this.programs.createDay({
        programId: program.id,
        userId,
        dayOfWeek: day.dayOfWeek,
        slotOrder: day.slotOrder,
        templateId,
        notes: day.notes,
      })
    }

    const full = await this.programs.getById(program.id, userId)
    return {
      program: full ?? undefined,
      skippedExercises: uniqueNames(skippedExercises),
    }
  }

  private async visibleExercises(userId: string): Promise<Exercise[]> {
    const result = await this.exercises.list({ userId, page: 1, limit: 500 })
    return result.items
  }

  private async toTemplateSnapshot(template: WorkoutTemplateWithExercises): Promise<SnapshotTemplate> {
    const exercises: SnapshotExercise[] = []
    for (const item of [...template.exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)) {
      const catalog = await this.exercises.getByIdAny(item.exerciseId)
      exercises.push({
        exerciseName: catalog?.name ?? item.exerciseId,
        exerciseId: item.exerciseId,
        exerciseOrder: item.exerciseOrder,
        targetSets: item.targetSets,
        isWarmup: item.isWarmup,
        minReps: item.minReps,
        maxReps: item.maxReps,
        targetWeight: item.targetWeight,
        restSeconds: item.restSeconds,
        notes: item.notes,
      })
    }
    return {
      name: template.name,
      description: template.description,
      exercises,
    }
  }

  private async cloneTemplate(
    userId: string,
    snapshot: SnapshotTemplate,
    catalog: Exercise[],
  ) {
    const template = await this.templates.create({
      userId,
      name: snapshot.name,
      description: snapshot.description,
    })

    const skippedExercises: string[] = []
    for (const item of [...snapshot.exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)) {
      const matched = matchSnapshotExercise(item, catalog)
      if (!matched) {
        skippedExercises.push(item.exerciseName)
        continue
      }
      await this.templates.createExercise({
        templateId: template.id,
        userId,
        exerciseId: matched.id,
        exerciseOrder: item.exerciseOrder,
        targetSets: item.targetSets,
        isWarmup: item.isWarmup,
        minReps: item.minReps ?? null,
        maxReps: item.maxReps ?? null,
        targetWeight: item.targetWeight ?? null,
        restSeconds: item.restSeconds ?? null,
        notes: item.notes ?? null,
      })
    }

    return { template, skippedExercises }
  }
}

function uniqueNames(names: string[]): string[] {
  return [...new Set(names)]
}
