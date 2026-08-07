import { Module } from '@nestjs/common'

import { AuthModule } from './modules/auth/auth.module'
import { ExerciseModule } from './modules/exercise/exercise.module'
import { EquipmentModule } from './modules/equipment/equipment.module'
import { HealthModule } from './modules/health/health.module'
import { SourceModule } from './modules/source/source.module'
import { TemplateModule } from './modules/template/template.module'
import { TrainingModule } from './modules/training/training.module'
import { ConfigModule } from './shared/config/config.module'
import { DatabaseModule } from './shared/database/database.module'
import { LoggerModule } from './shared/logger/logger.module'

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    ExerciseModule,
    EquipmentModule,
    SourceModule,
    TemplateModule,
    TrainingModule,
  ],
})
export class AppModule {}
