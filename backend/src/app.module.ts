import { Module } from '@nestjs/common'

import { AuthModule } from './modules/auth/auth.module'
import { BodyMeasurementModule } from './modules/body-measurement/body-measurement.module'
import { ExerciseModule } from './modules/exercise/exercise.module'
import { FeedbackModule } from './modules/feedback/feedback.module'
import { HealthModule } from './modules/health/health.module'
import { ProgramModule } from './modules/program/program.module'
import { SourceModule } from './modules/source/source.module'
import { StatsModule } from './modules/stats/stats.module'
import { TemplateModule } from './modules/template/template.module'
import { TrainingModule } from './modules/training/training.module'
import { CacheModule } from './shared/cache/cache.module'
import { ConfigModule } from './shared/config/config.module'
import { DatabaseModule } from './shared/database/database.module'
import { LoggerModule } from './shared/logger/logger.module'

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    CacheModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    BodyMeasurementModule,
    FeedbackModule,
    ExerciseModule,
    SourceModule,
    TemplateModule,
    TrainingModule,
    ProgramModule,
    StatsModule,
  ],
})
export class AppModule {}
