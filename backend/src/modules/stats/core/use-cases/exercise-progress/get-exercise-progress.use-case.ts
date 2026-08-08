import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../../../training/core/ports/training-repository.port'
import { ExerciseProgressPoint } from '../../../../training/core/types'

export interface GetExerciseProgressInput {
  userId: string
  exerciseId: string
  from: string
  to: string
}

export interface GetExerciseProgressOutput {
  points: ExerciseProgressPoint[]
}

export class GetExerciseProgressUseCase
  implements UseCase<GetExerciseProgressInput, GetExerciseProgressOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: GetExerciseProgressInput): Promise<GetExerciseProgressOutput> {
    const points = await this.trainingRepository.getExerciseProgress(input)
    return { points }
  }
}
