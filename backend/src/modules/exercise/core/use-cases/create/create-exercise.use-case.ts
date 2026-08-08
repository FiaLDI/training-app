import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import { CreateExerciseInput } from './interfaces/create-exercise.input'
import { CreateExerciseOutput } from './interfaces/create-exercise.output'

export class CreateExerciseUseCase implements UseCase<CreateExerciseInput, CreateExerciseOutput> {
  constructor(private readonly exerciseRepository: ExerciseRepositoryPort) {}

  public async execute(input: CreateExerciseInput): Promise<CreateExerciseOutput> {
    if (input.id) {
      const existing = await this.exerciseRepository.getById(input.id)
      if (existing) return { exercise: existing }
    }
    const exercise = await this.exerciseRepository.create(input)
    return { exercise }
  }
}
