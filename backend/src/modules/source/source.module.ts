import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { ExerciseModule } from '../exercise/exercise.module'
import { EXERCISE_REPOSITORY_PORT, ExerciseRepositoryPort } from '../exercise/core/ports/exercise-repository.port'
import { SourceHttpController } from './controller/source.http-controller'
import { SOURCE_REPOSITORY_PORT } from './core/ports/source-repository.port'
import { CreateSourceUseCase } from './core/use-cases/create/create-source.use-case'
import { CreateTimecodeUseCase } from './core/use-cases/create-timecode/create-timecode.use-case'
import { DeleteSourceUseCase } from './core/use-cases/delete/delete-source.use-case'
import { DeleteTimecodeUseCase } from './core/use-cases/delete-timecode/delete-timecode.use-case'
import { GetSourceUseCase } from './core/use-cases/get/get-source.use-case'
import { ListSourcesUseCase } from './core/use-cases/list/list-sources.use-case'
import { ListTimecodesUseCase } from './core/use-cases/list-timecodes/list-timecodes.use-case'
import { UpdateSourceUseCase } from './core/use-cases/update/update-source.use-case'
import { UpdateTimecodeUseCase } from './core/use-cases/update-timecode/update-timecode.use-case'
import { ExerciseSourceEntity } from './core/entity/exercise-source.entity'
import { ExerciseTimecodeEntity } from './core/entity/exercise-timecode.entity'
import { SourceTypeormRepository } from './infrastructure/source.typeorm-repository'

@Module({
  imports: [
    AuthModule,
    ExerciseModule,
    TypeOrmModule.forFeature([ExerciseSourceEntity, ExerciseTimecodeEntity]),
  ],
  controllers: [SourceHttpController],
  providers: [
    SourceTypeormRepository,
    {
      provide: SOURCE_REPOSITORY_PORT,
      useExisting: SourceTypeormRepository,
    },
    {
      provide: ListSourcesUseCase,
      useFactory: (repo: SourceTypeormRepository, exercises: ExerciseRepositoryPort) =>
        new ListSourcesUseCase(repo, exercises),
      inject: [SourceTypeormRepository, EXERCISE_REPOSITORY_PORT],
    },
    {
      provide: GetSourceUseCase,
      useFactory: (repo: SourceTypeormRepository, exercises: ExerciseRepositoryPort) =>
        new GetSourceUseCase(repo, exercises),
      inject: [SourceTypeormRepository, EXERCISE_REPOSITORY_PORT],
    },
    {
      provide: CreateSourceUseCase,
      useFactory: (repo: SourceTypeormRepository, exercises: ExerciseRepositoryPort) =>
        new CreateSourceUseCase(repo, exercises),
      inject: [SourceTypeormRepository, EXERCISE_REPOSITORY_PORT],
    },
    {
      provide: UpdateSourceUseCase,
      useFactory: (repo: SourceTypeormRepository, exercises: ExerciseRepositoryPort) =>
        new UpdateSourceUseCase(repo, exercises),
      inject: [SourceTypeormRepository, EXERCISE_REPOSITORY_PORT],
    },
    {
      provide: DeleteSourceUseCase,
      useFactory: (repo: SourceTypeormRepository, exercises: ExerciseRepositoryPort) =>
        new DeleteSourceUseCase(repo, exercises),
      inject: [SourceTypeormRepository, EXERCISE_REPOSITORY_PORT],
    },
    {
      provide: ListTimecodesUseCase,
      useFactory: (repo: SourceTypeormRepository, exercises: ExerciseRepositoryPort) =>
        new ListTimecodesUseCase(repo, exercises),
      inject: [SourceTypeormRepository, EXERCISE_REPOSITORY_PORT],
    },
    {
      provide: CreateTimecodeUseCase,
      useFactory: (repo: SourceTypeormRepository, exercises: ExerciseRepositoryPort) =>
        new CreateTimecodeUseCase(repo, exercises),
      inject: [SourceTypeormRepository, EXERCISE_REPOSITORY_PORT],
    },
    {
      provide: UpdateTimecodeUseCase,
      useFactory: (repo: SourceTypeormRepository, exercises: ExerciseRepositoryPort) =>
        new UpdateTimecodeUseCase(repo, exercises),
      inject: [SourceTypeormRepository, EXERCISE_REPOSITORY_PORT],
    },
    {
      provide: DeleteTimecodeUseCase,
      useFactory: (repo: SourceTypeormRepository, exercises: ExerciseRepositoryPort) =>
        new DeleteTimecodeUseCase(repo, exercises),
      inject: [SourceTypeormRepository, EXERCISE_REPOSITORY_PORT],
    },
  ],
  exports: [
    ListSourcesUseCase,
    GetSourceUseCase,
    CreateSourceUseCase,
    UpdateSourceUseCase,
    DeleteSourceUseCase,
    SOURCE_REPOSITORY_PORT,
  ],
})
export class SourceModule {}
