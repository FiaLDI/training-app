import { NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { CreateTemplateExerciseInput } from './interfaces/create-template-exercise.input'
import { CreateTemplateExerciseOutput } from './interfaces/create-template-exercise.output'

export class CreateTemplateExerciseUseCase
  implements UseCase<CreateTemplateExerciseInput, CreateTemplateExerciseOutput>
{
  constructor(
    private readonly templateRepository: TemplateRepositoryPort,
    private readonly exerciseRepository: ExerciseRepositoryPort,
  ) {}

  public async execute(input: CreateTemplateExerciseInput): Promise<CreateTemplateExerciseOutput> {
    const catalogExercise = await this.exerciseRepository.getById(input.exerciseId, input.userId)
    if (!catalogExercise) {
      throw new NotFoundException('Exercise not found')
    }

    const exercise = await this.templateRepository.createExercise(input)
    return { exercise }
  }
}
