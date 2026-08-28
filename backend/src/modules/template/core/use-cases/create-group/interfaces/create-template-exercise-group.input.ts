import { ExerciseGroupType } from '../../../../../../common/core/exercise-group'

export interface CreateTemplateExerciseGroupInput {
  id?: string
  templateId: string
  userId: string
  exerciseIds: string[]
  type?: ExerciseGroupType
  restSeconds?: number | null
}
