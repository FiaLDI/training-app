import { ForbiddenException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { canEditExercise } from '../../lib/can-edit-exercise'
import { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import { DeleteExerciseInput } from './interfaces/delete-exercise.input'
import { DeleteExerciseOutput } from './interfaces/delete-exercise.output'

export class DeleteExerciseUseCase implements UseCase<DeleteExerciseInput, DeleteExerciseOutput> {
  constructor(private readonly exerciseRepository: ExerciseRepositoryPort) {}

  public async execute(input: DeleteExerciseInput): Promise<DeleteExerciseOutput> {
    const existing = await this.exerciseRepository.getById(input.id, input.userId)
    if (!existing) {
      return { deleted: false }
    }

    if (!canEditExercise(existing, { id: input.userId, role: input.role })) {
      throw new ForbiddenException('Недостаточно прав для удаления этого упражнения')
    }

    const deleted = await this.exerciseRepository.delete(input.id)
    return { deleted }
  }
}
