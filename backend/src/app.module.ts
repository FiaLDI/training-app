import { Module } from '@nestjs/common'

import { AuthModule } from './modules/auth/auth.module'
import { BodyMeasurementModule } from './modules/body-measurement/body-measurement.module'
import { CatalogModule } from './modules/catalog/catalog.module'
import { CoachModule } from './modules/coach/coach.module'
import { ExerciseModule } from './modules/exercise/exercise.module'
import { ExerciseSeedModule } from './modules/exercise/exercise-seed.module'
import { FeedbackModule } from './modules/feedback/feedback.module'
import { HealthModule } from './modules/health/health.module'
import { NewsModule } from './modules/news/news.module'
import { ProgramModule } from './modules/program/program.module'
import { ShareModule } from './modules/share/share.module'
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
    NewsModule,
    CatalogModule,
    ShareModule,
    CoachModule,
    ExerciseModule,
    ExerciseSeedModule,
    SourceModule,
    TemplateModule,
    TrainingModule,
    ProgramModule,
    StatsModule,
  ],
})
export class AppModule {}
