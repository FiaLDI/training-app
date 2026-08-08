import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { TrainingModule } from '../training/training.module'
import { TrainingTypeormRepository } from '../training/infrastructure/training.typeorm-repository'
import { StatsHttpController } from './controller/stats.http-controller'
import { GetExerciseProgressUseCase } from './core/use-cases/exercise-progress/get-exercise-progress.use-case'
import { GetVolumeStatsUseCase } from './core/use-cases/volume/get-volume-stats.use-case'

@Module({
  imports: [AuthModule, TrainingModule],
  controllers: [StatsHttpController],
  providers: [
    {
      provide: GetVolumeStatsUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new GetVolumeStatsUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
    {
      provide: GetExerciseProgressUseCase,
      useFactory: (repo: TrainingTypeormRepository) => new GetExerciseProgressUseCase(repo),
      inject: [TrainingTypeormRepository],
    },
  ],
})
export class StatsModule {}
