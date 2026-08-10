import 'reflect-metadata'

import { resolve } from 'path'

import { config } from 'dotenv'
import { existsSync } from 'fs'
import { DataSource } from 'typeorm'

import { UserEntity } from './src/modules/auth/core/entity/user.entity'
import { ExerciseEntity } from './src/modules/exercise/core/entity/exercise.entity'
import { ExerciseSourceEntity } from './src/modules/source/core/entity/exercise-source.entity'
import { ExerciseTimecodeEntity } from './src/modules/source/core/entity/exercise-timecode.entity'
import { ProgramDayEntity } from './src/modules/program/core/entity/program-day.entity'
import { ProgramEntity } from './src/modules/program/core/entity/program.entity'
import { TemplateExerciseEntity } from './src/modules/template/core/entity/template-exercise.entity'
import { WorkoutTemplateEntity } from './src/modules/template/core/entity/workout-template.entity'
import { TrainingExerciseEntity } from './src/modules/training/core/entity/training-exercise.entity'
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
    ExerciseEntity,
    ExerciseSourceEntity,
    ExerciseTimecodeEntity,
    WorkoutTemplateEntity,
    TemplateExerciseEntity,
    ProgramEntity,
    ProgramDayEntity,
    TrainingEntity,
    TrainingExerciseEntity,
    TrainingSetEntity,
  ],

  migrations: ['src/migrations/*.ts'],
})
