import { ExerciseGroupType } from '../../../../../../common/core/exercise-group'

export interface CreateTrainingExerciseGroupInput {
  id?: string
  trainingId: string
  userId: string
  exerciseIds: string[]
  type?: ExerciseGroupType
  restSeconds?: number | null
}