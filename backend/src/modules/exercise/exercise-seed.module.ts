import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { EXERCISE_REPOSITORY_PORT, ExerciseRepositoryPort } from './core/ports/exercise-repository.port'
import { ExportSystemExerciseSeedUseCase } from './core/use-cases/export-seed/export-system-exercise-seed.use-case'
import { ImportSystemExerciseSeedUseCase } from './core/use-cases/import-seed/import-system-exercise-seed.use-case'
import { ExerciseSeedHttpController } from './controller/exercise-seed.http-controller'
import { UploadFileStore, resolveUploadDir } from './infrastructure/upload-file-store'
import { SOURCE_REPOSITORY_PORT, SourceRepositoryPort } from '../source/core/ports/source-repository.port'
import { SourceModule } from '../source/source.module'
import { ExerciseModule } from './exercise.module'

@Module({
  imports: [AuthModule, ExerciseModule, SourceModule],
  controllers: [ExerciseSeedHttpController],
  providers: [
    {
      provide: UploadFileStore,
      useFactory: () => new UploadFileStore(resolveUploadDir()),
    },
    {
      provide: ExportSystemExerciseSeedUseCase,
      useFactory: (exercises: ExerciseRepositoryPort, files: UploadFileStore) =>
        new ExportSystemExerciseSeedUseCase(exercises, files),
      inject: [EXERCISE_REPOSITORY_PORT, UploadFileStore],
    },
    {
      provide: ImportSystemExerciseSeedUseCase,
      useFactory: (
        exercises: ExerciseRepositoryPort,
        sources: SourceRepositoryPort,
        files: UploadFileStore,
      ) => new ImportSystemExerciseSeedUseCase(exercises, sources, files),
      inject: [EXERCISE_REPOSITORY_PORT, SOURCE_REPOSITORY_PORT, UploadFileStore],
    },
  ],
})
export class ExerciseSeedModule {}
