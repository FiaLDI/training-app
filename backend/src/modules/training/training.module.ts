import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { StatsCacheService } from '../../shared/stats/stats-cache.service'
import { ExerciseModule } from '../exercise/exercise.module'
import { EXERCISE_REPOSITORY_PORT, ExerciseRepositoryPort } from '../exercise/core/ports/exercise-repository.port'
import { TemplateModule } from '../template/template.module'
import { TemplateTypeormRepository } from '../template/infrastructure/template.typeorm-repository'
import { TrainingHttpController } from './controller/training.http-controller'
import { TRAINING_REPOSITORY_PORT } from './core/ports/training-repository.port'
import { CreateTrainingUseCase } from './core/use-cases/create/create-training.use-case'
import { CreateTrainingExerciseUseCase } from './core/use-cases/create-exercise/create-training-exercise.use-case'
import { AddExerciseToTrainingGroupUseCase } from './core/use-cases/add-to-group/add-exercise-to-training-group.use-case'
import { CreateTrainingExerciseGroupUseCase } from './core/use-cases/create-group/create-training-exercise-group.use-case'
import { CreateTrainingSetUseCase } from './core/use-cases/create-set/create-training-set.use-case'
import { DeleteTrainingUseCase } from './core/use-cases/delete/delete-training.use-case'
import { DeleteTrainingExerciseUseCase } from './core/use-cases/delete-exercise/delete-training-exercise.use-case'
import { DeleteTrainingExerciseGroupUseCase } from './core/use-cases/delete-group/delete-training-exercise-group.use-case'
import { DeleteTrainingSetUseCase } from './core/use-cases/delete-set/delete-training-set.use-case'
import { GetTrainingUseCase } from './core/use-cases/get/get-training.use-case'
import { ListTrainingsUseCase } from './core/use-cases/list/list-trainings.use-case'
import { UpdateTrainingUseCase } from './core/use-cases/update/update-training.use-case'
import { UpdateTrainingExerciseUseCase } from './core/use-cases/update-exercise/update-training-exercise.use-case'
import { UpdateTrainingExerciseGroupUseCase } from './core/use-cases/update-group/update-training-exercise-group.use-case'
import { UpdateTrainingSetUseCase } from './core/use-cases/update-set/update-training-set.use-case'
import { TrainingExerciseGroupEntity } from './core/entity/training-exercise-group.entity'
import { TrainingExerciseEntity } from './core/entity/training-exercise.entity'
import { TrainingSetEntity } from './core/entity/training-set.entity'
import { TrainingEntity } from './core/entity/training.entity'
import { TrainingTypeormRepository } from './infrastructure/training.typeorm-repository'

@Module({
  imports: [
    AuthModule,
    ExerciseModule,
    TemplateModule,
    TypeOrmModule.forFeature([
      TrainingEntity,
      TrainingExerciseEntity,
      TrainingExerciseGroupEntity,
      TrainingSetEntity,
    ]),
  ],
  controllers: [TrainingHttpController],
  providers: [
    StatsCacheService,
    TrainingTypeormRepository,
    {
      provide: TRAINING_REPOSITORY_PORT,
      useExisting: TrainingTypeormRepository,
    },
    {
      provide: ListTrainingsUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new ListTrainingsUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: GetTrainingUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new GetTrainingUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: CreateTrainingUseCase,
      useFactory: (trainingRepo: TrainingTypeormRepository, templateRepo: TemplateTypeormRepository) =>
        new CreateTrainingUseCase(trainingRepo, templateRepo),
      inject: [TrainingTypeormRepository, TemplateTypeormRepository],
    },
    {
      provide: UpdateTrainingUseCase,
      useFactory: (repo: TrainingTypeormRepository, statsCache: StatsCacheService) =>
        new UpdateTrainingUseCase(repo, statsCache),
      inject: [TrainingTypeormRepository, StatsCacheService],
    },
    {
      provide: DeleteTrainingUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new DeleteTrainingUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: CreateTrainingExerciseUseCase,
      useFactory: (repo: TrainingTypeormRepository, exercises: ExerciseRepositoryPort) =>
        new CreateTrainingExerciseUseCase(repo, exercises),
      inject: [TrainingTypeormRepository, EXERCISE_REPOSITORY_PORT],
    },
    {
      provide: UpdateTrainingExerciseUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new UpdateTrainingExerciseUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: DeleteTrainingExerciseUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new DeleteTrainingExerciseUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: CreateTrainingSetUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new CreateTrainingSetUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: UpdateTrainingSetUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new UpdateTrainingSetUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: DeleteTrainingSetUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new DeleteTrainingSetUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: CreateTrainingExerciseGroupUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new CreateTrainingExerciseGroupUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: AddExerciseToTrainingGroupUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new AddExerciseToTrainingGroupUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: UpdateTrainingExerciseGroupUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new UpdateTrainingExerciseGroupUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: DeleteTrainingExerciseGroupUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new DeleteTrainingExerciseGroupUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
  ],
  exports: [
    ListTrainingsUseCase,
    GetTrainingUseCase,
    CreateTrainingUseCase,
    UpdateTrainingUseCase,
    DeleteTrainingUseCase,
    TrainingTypeormRepository,
    TRAINING_REPOSITORY_PORT,
    StatsCacheService,
  ],
})
export class TrainingModule {}
