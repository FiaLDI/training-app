import { ForbiddenException, NotFoundException } from '@nestjs/common'

import { UserRole } from '../../../auth/core/types'
import { canEditExercise } from '../../../exercise/core/lib/can-edit-exercise'
import { ExerciseRepositoryPort } from '../../../exercise/core/ports/exercise-repository.port'
import { Exercise } from '../../../exercise/core/types'
import { SourceRepositoryPort } from '../ports/source-repository.port'
import { ExerciseSource } from '../types'

export type Actor = { id: string; role: UserRole }

export class SourceExerciseAccess {
  constructor(
    private readonly sourceRepository: SourceRepositoryPort,
    private readonly exerciseRepository: ExerciseRepositoryPort,
  ) {}

  async requireVisibleExercise(exerciseId: string, actor: Actor): Promise<Exercise> {
    const exercise = await this.exerciseRepository.getById(exerciseId, actor.id)
    if (!exercise) {
      throw new NotFoundException('Exercise not found')
    }
    return exercise
  }

  async requireEditableExercise(exerciseId: string, actor: Actor): Promise<Exercise> {
    const exercise = await this.requireVisibleExercise(exerciseId, actor)
    if (!canEditExercise(exercise, actor)) {
      throw new ForbiddenException('Недостаточно прав для изменения источников этого упражнения')
    }
    return exercise
  }

  async requireVisibleSource(
    sourceId: string,
    actor: Actor,
  ): Promise<{ source: ExerciseSource; exercise: Exercise } | null> {
    const source = await this.sourceRepository.getById(sourceId)
    if (!source) return null
    const exercise = await this.exerciseRepository.getById(source.exerciseId, actor.id)
    if (!exercise) return null
    return { source, exercise }
  }

  async requireEditableSource(
    sourceId: string,
    actor: Actor,
  ): Promise<{ source: ExerciseSource; exercise: Exercise } | null> {
    const result = await this.requireVisibleSource(sourceId, actor)
    if (!result) return null
    if (!canEditExercise(result.exercise, actor)) {
      throw new ForbiddenException('Недостаточно прав для изменения источников этого упражнения')
    }
    return result
  }
}
