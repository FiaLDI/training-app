import { ForbiddenException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { canEditExercise } from '../../lib/can-edit-exercise'
import { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import { UpdateExerciseInput } from './interfaces/update-exercise.input'
import { UpdateExerciseOutput } from './interfaces/update-exercise.output'

export class UpdateExerciseUseCase implements UseCase<UpdateExerciseInput, UpdateExerciseOutput> {
  constructor(private readonly exerciseRepository: ExerciseRepositoryPort) {}

  public async execute(input: UpdateExerciseInput): Promise<UpdateExerciseOutput> {
    const existing = await this.exerciseRepository.getById(input.id, input.userId)
    if (!existing) {
      return { exercise: null }
    }

    if (!canEditExercise(existing, { id: input.userId, role: input.role })) {
      throw new ForbiddenException('Недостаточно прав для изменения этого упражнения')
    }

    if (input.isSystem === true && input.role !== 'admin') {
      throw new ForbiddenException('Только администратор может сделать упражнение системным')
    }

    const exercise = await this.exerciseRepository.update({
      id: input.id,
      userId: input.isSystem === true ? null : undefined,
      name: input.name,
      description: input.description,
      muscleGroup: input.muscleGroup,
      difficulty: input.difficulty,
      metadata: input.metadata,
    })
    return { exercise }
  }
}
