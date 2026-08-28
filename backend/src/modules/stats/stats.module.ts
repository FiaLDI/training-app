import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { BodyMeasurementModule } from '../body-measurement/body-measurement.module'
import { TrainingModule } from '../training/training.module'
import { BodyMeasurementTypeormRepository } from '../body-measurement/infrastructure/body-measurement.typeorm-repository'
import { TrainingTypeormRepository } from '../training/infrastructure/training.typeorm-repository'
import { StatsCacheService } from '../../shared/stats/stats-cache.service'
import { StatsHttpController } from './controller/stats.http-controller'
import { GetActivityStatsUseCase } from './core/use-cases/activity/get-activity-stats.use-case'
import { GetStrengthCorrelationUseCase } from './core/use-cases/correlation/get-strength-correlation.use-case'
import { GetExerciseProgressUseCase } from './core/use-cases/exercise-progress/get-exercise-progress.use-case'
import { GetMuscleGroupStatsUseCase } from './core/use-cases/muscle-groups/get-muscle-group-stats.use-case'
import { GetVolumeStatsUseCase } from './core/use-cases/volume/get-volume-stats.use-case'

@Module({
  imports: [AuthModule, TrainingModule, BodyMeasurementModule],
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
    {
      provide: GetMuscleGroupStatsUseCase,
      useFactory: (repo: TrainingTypeormRepository, cache: StatsCacheService) =>
        new GetMuscleGroupStatsUseCase(repo, cache),
      inject: [TrainingTypeormRepository, StatsCacheService],
    },
    {
      provide: GetActivityStatsUseCase,
      useFactory: (repo: TrainingTypeormRepository, cache: StatsCacheService) =>
        new GetActivityStatsUseCase(repo, cache),
      inject: [TrainingTypeormRepository, StatsCacheService],
    },
    {
      provide: GetStrengthCorrelationUseCase,
      useFactory: (
        repo: TrainingTypeormRepository,
        body: BodyMeasurementTypeormRepository,
        cache: StatsCacheService,
      ) => new GetStrengthCorrelationUseCase(repo, body, cache),
      inject: [TrainingTypeormRepository, BodyMeasurementTypeormRepository, StatsCacheService],
    },
  ],
})
export class StatsModule {}