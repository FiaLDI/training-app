import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ExerciseHttpController } from './controller/exercise.http-controller'
import { EXERCISE_REPOSITORY_PORT } from './core/ports/exercise-repository.port'
import { CreateExerciseUseCase } from './core/use-cases/create/create-exercise.use-case'
import { DeleteExerciseUseCase } from './core/use-cases/delete/delete-exercise.use-case'
import { GetExerciseUseCase } from './core/use-cases/get/get-exercise.use-case'
import { ListExercisesUseCase } from './core/use-cases/list/list-exercises.use-case'
import { UpdateExerciseUseCase } from './core/use-cases/update/update-exercise.use-case'
import { ExerciseEntity } from './core/entity/exercise.entity'
import { ExerciseTypeormRepository } from './infrastructure/exercise.typeorm-repository'

@Module({
  imports: [TypeOrmModule.forFeature([ExerciseEntity])],
  controllers: [ExerciseHttpController],
  providers: [
    ExerciseTypeormRepository,
    {
      provide: EXERCISE_REPOSITORY_PORT,
      useExisting: ExerciseTypeormRepository,
    },
    {
      provide: ListExercisesUseCase,
      useFactory: (repo: ExerciseTypeormRepository) => new ListExercisesUseCase(repo),
      inject: [ExerciseTypeormRepository],
    },
    {
      provide: GetExerciseUseCase,
      useFactory: (repo: ExerciseTypeormRepository) => new GetExerciseUseCase(repo),
      inject: [ExerciseTypeormRepository],
    },
    {
      provide: CreateExerciseUseCase,
      useFactory: (repo: ExerciseTypeormRepository) => new CreateExerciseUseCase(repo),
      inject: [ExerciseTypeormRepository],
    },
    {
      provide: UpdateExerciseUseCase,
      useFactory: (repo: ExerciseTypeormRepository) => new UpdateExerciseUseCase(repo),
      inject: [ExerciseTypeormRepository],
    },
    {
      provide: DeleteExerciseUseCase,
      useFactory: (repo: ExerciseTypeormRepository) => new DeleteExerciseUseCase(repo),
      inject: [ExerciseTypeormRepository],
    },
  ],
  exports: [
    ListExercisesUseCase,
    GetExerciseUseCase,
    CreateExerciseUseCase,
    UpdateExerciseUseCase,
    DeleteExerciseUseCase,
    EXERCISE_REPOSITORY_PORT,
  ],
})
export class ExerciseModule {}
