import 'reflect-metadata'

import { resolve } from 'path'

import { config } from 'dotenv'
import { existsSync } from 'fs'
import { DataSource } from 'typeorm'

import { BodyMeasurementEntity } from './src/modules/body-measurement/core/entity/body-measurement.entity'
import { UserEntity } from './src/modules/auth/core/entity/user.entity'
import { FeedbackEntity } from './src/modules/feedback/core/entity/feedback.entity'
import { NewsEntity } from './src/modules/news/core/entity/news.entity'
import { CatalogProgramEntity } from './src/modules/catalog/core/entity/catalog-program.entity'
import { ShareLinkEntity } from './src/modules/share/core/entity/share-link.entity'
import { CoachInviteEntity } from './src/modules/coach/core/entity/coach-invite.entity'
import { CoachRelationshipEntity } from './src/modules/coach/core/entity/coach-relationship.entity'
import { ProgramAssignmentEntity } from './src/modules/coach/core/entity/program-assignment.entity'
import { TrainingSetCommentEntity } from './src/modules/coach/core/entity/training-set-comment.entity'
import { ExerciseEntity } from './src/modules/exercise/core/entity/exercise.entity'
import { ExerciseSourceEntity } from './src/modules/source/core/entity/exercise-source.entity'
import { ExerciseTimecodeEntity } from './src/modules/source/core/entity/exercise-timecode.entity'
import { ProgramDayEntity } from './src/modules/program/core/entity/program-day.entity'
import { ProgramEntity } from './src/modules/program/core/entity/program.entity'
import { TemplateExerciseEntity } from './src/modules/template/core/entity/template-exercise.entity'
import { TemplateExerciseGroupEntity } from './src/modules/template/core/entity/template-exercise-group.entity'
import { WorkoutTemplateEntity } from './src/modules/template/core/entity/workout-template.entity'
import { TrainingExerciseEntity } from './src/modules/training/core/entity/training-exercise.entity'
import { TrainingExerciseGroupEntity } from './src/modules/training/core/entity/training-exercise-group.entity'
import { TrainingSetEntity } from './src/modules/training/core/entity/training-set.entity'
import { TrainingEntity } from './src/modules/training/core/entity/training.entity'

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../.env'),
  resolve(__dirname, '../.env'),
]
for (const path of envCandidates) {
  if (existsSync(path)) {
    config({ path })
    break
  }
}

export default new DataSource({
  type: 'postgres',

  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),

  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,

  synchronize: false,

  logging: true,

  entities: [
    UserEntity,
    BodyMeasurementEntity,
    FeedbackEntity,
    NewsEntity,
    CatalogProgramEntity,
    ShareLinkEntity,
    CoachInviteEntity,
    CoachRelationshipEntity,
    ProgramAssignmentEntity,
    TrainingSetCommentEntity,
    ExerciseEntity,
    ExerciseSourceEntity,
    ExerciseTimecodeEntity,
    WorkoutTemplateEntity,
    TemplateExerciseEntity,
    TemplateExerciseGroupEntity,
    ProgramEntity,
    ProgramDayEntity,
    TrainingEntity,
    TrainingExerciseEntity,
    TrainingExerciseGroupEntity,
    TrainingSetEntity,
  ],

  migrations: ['src/migrations/*.ts'],
})
