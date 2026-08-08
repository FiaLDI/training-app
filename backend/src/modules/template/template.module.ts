import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { TemplateHttpController } from './controller/template.http-controller'
import { TEMPLATE_REPOSITORY_PORT } from './core/ports/template-repository.port'
import { CreateTemplateUseCase } from './core/use-cases/create/create-template.use-case'
import { CreateTemplateExerciseUseCase } from './core/use-cases/create-exercise/create-template-exercise.use-case'
import { DeleteTemplateUseCase } from './core/use-cases/delete/delete-template.use-case'
import { DeleteTemplateExerciseUseCase } from './core/use-cases/delete-exercise/delete-template-exercise.use-case'
import { GetTemplateUseCase } from './core/use-cases/get/get-template.use-case'
import { ListTemplatesUseCase } from './core/use-cases/list/list-templates.use-case'
import { UpdateTemplateUseCase } from './core/use-cases/update/update-template.use-case'
import { UpdateTemplateExerciseUseCase } from './core/use-cases/update-exercise/update-template-exercise.use-case'
import { TemplateExerciseEntity } from './core/entity/template-exercise.entity'
import { TemplateTypeormRepository } from './infrastructure/template.typeorm-repository'
import { WorkoutTemplateEntity } from './core/entity/workout-template.entity'

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([WorkoutTemplateEntity, TemplateExerciseEntity]),
  ],
  controllers: [TemplateHttpController],
  providers: [
    TemplateTypeormRepository,
    {
      provide: TEMPLATE_REPOSITORY_PORT,
      useExisting: TemplateTypeormRepository,
    },
    {
      provide: ListTemplatesUseCase,
      useFactory: (repo: TemplateTypeormRepository) => new ListTemplatesUseCase(repo),
      inject: [TemplateTypeormRepository],
    },
    {
      provide: GetTemplateUseCase,
      useFactory: (repo: TemplateTypeormRepository) => new GetTemplateUseCase(repo),
      inject: [TemplateTypeormRepository],
    },
    {
      provide: CreateTemplateUseCase,
      useFactory: (repo: TemplateTypeormRepository) => new CreateTemplateUseCase(repo),
      inject: [TemplateTypeormRepository],
    },
    {
      provide: UpdateTemplateUseCase,
      useFactory: (repo: TemplateTypeormRepository) => new UpdateTemplateUseCase(repo),
      inject: [TemplateTypeormRepository],
    },
    {
      provide: DeleteTemplateUseCase,
      useFactory: (repo: TemplateTypeormRepository) => new DeleteTemplateUseCase(repo),
      inject: [TemplateTypeormRepository],
    },
    {
      provide: CreateTemplateExerciseUseCase,
      useFactory: (repo: TemplateTypeormRepository) => new CreateTemplateExerciseUseCase(repo),
      inject: [TemplateTypeormRepository],
    },
    {
      provide: UpdateTemplateExerciseUseCase,
      useFactory: (repo: TemplateTypeormRepository) => new UpdateTemplateExerciseUseCase(repo),
      inject: [TemplateTypeormRepository],
    },
    {
      provide: DeleteTemplateExerciseUseCase,
      useFactory: (repo: TemplateTypeormRepository) => new DeleteTemplateExerciseUseCase(repo),
      inject: [TemplateTypeormRepository],
    },
  ],
  exports: [
    ListTemplatesUseCase,
    GetTemplateUseCase,
    CreateTemplateUseCase,
    UpdateTemplateUseCase,
    DeleteTemplateUseCase,
    TemplateTypeormRepository,
    TEMPLATE_REPOSITORY_PORT,
  ],
})
export class TemplateModule {}
