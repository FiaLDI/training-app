import { ConflictException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import { CreateExerciseInput } from './interfaces/create-exercise.input'
import { CreateExerciseOutput } from './interfaces/create-exercise.output'

export class CreateExerciseUseCase implements UseCase<CreateExerciseInput, CreateExerciseOutput> {
  constructor(private readonly exerciseRepository: ExerciseRepositoryPort) {}

  public async execute(input: CreateExerciseInput): Promise<CreateExerciseOutput> {
    if (input.id) {
      // Prefer scoped lookup for the creating user (system ∪ mine).
      if (input.userId) {
        const visible = await this.exerciseRepository.getById(input.id, input.userId)
        if (visible) return { exercise: visible }
      }
      // Creating a system exercise with a known id — repository create handles ownership match.
    }

    try {
      const exercise = await this.exerciseRepository.create(input)
      return { exercise }
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : null
      if (code === '23505') {
        throw new ConflictException('Exercise id already exists')
      }
      throw err
    }
  }
}
