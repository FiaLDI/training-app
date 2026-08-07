import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

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
  imports: [TypeOrmModule.forFeature([ExerciseSourceEntity, ExerciseTimecodeEntity])],
  controllers: [SourceHttpController],
  providers: [
    SourceTypeormRepository,
    {
      provide: SOURCE_REPOSITORY_PORT,
      useExisting: SourceTypeormRepository,
    },
    {
      provide: ListSourcesUseCase,
      useFactory: (repo: SourceTypeormRepository) => new ListSourcesUseCase(repo),
      inject: [SourceTypeormRepository],
    },
    {
      provide: GetSourceUseCase,
      useFactory: (repo: SourceTypeormRepository) => new GetSourceUseCase(repo),
      inject: [SourceTypeormRepository],
    },
    {
      provide: CreateSourceUseCase,
      useFactory: (repo: SourceTypeormRepository) => new CreateSourceUseCase(repo),
      inject: [SourceTypeormRepository],
    },
    {
      provide: UpdateSourceUseCase,
      useFactory: (repo: SourceTypeormRepository) => new UpdateSourceUseCase(repo),
      inject: [SourceTypeormRepository],
    },
    {
      provide: DeleteSourceUseCase,
      useFactory: (repo: SourceTypeormRepository) => new DeleteSourceUseCase(repo),
      inject: [SourceTypeormRepository],
    },
    {
      provide: ListTimecodesUseCase,
      useFactory: (repo: SourceTypeormRepository) => new ListTimecodesUseCase(repo),
      inject: [SourceTypeormRepository],
    },
    {
      provide: CreateTimecodeUseCase,
      useFactory: (repo: SourceTypeormRepository) => new CreateTimecodeUseCase(repo),
      inject: [SourceTypeormRepository],
    },
    {
      provide: UpdateTimecodeUseCase,
      useFactory: (repo: SourceTypeormRepository) => new UpdateTimecodeUseCase(repo),
      inject: [SourceTypeormRepository],
    },
    {
      provide: DeleteTimecodeUseCase,
      useFactory: (repo: SourceTypeormRepository) => new DeleteTimecodeUseCase(repo),
      inject: [SourceTypeormRepository],
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
