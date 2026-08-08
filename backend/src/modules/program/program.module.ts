import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { TemplateModule } from '../template/template.module'
import { TemplateTypeormRepository } from '../template/infrastructure/template.typeorm-repository'
import { TrainingModule } from '../training/training.module'
import { TrainingTypeormRepository } from '../training/infrastructure/training.typeorm-repository'
import { ProgramHttpController } from './controller/program.http-controller'
import { PROGRAM_REPOSITORY_PORT } from './core/ports/program-repository.port'
import { ApplyProgramUseCase } from './core/use-cases/apply/apply-program.use-case'
import { CreateProgramUseCase } from './core/use-cases/create/create-program.use-case'
import { CreateProgramDayUseCase } from './core/use-cases/create-day/create-program-day.use-case'
import { DeleteProgramUseCase } from './core/use-cases/delete/delete-program.use-case'
import { DeleteProgramDayUseCase } from './core/use-cases/delete-day/delete-program-day.use-case'
import { GetProgramUseCase } from './core/use-cases/get/get-program.use-case'
import { ListProgramsUseCase } from './core/use-cases/list/list-programs.use-case'
import { UpdateProgramUseCase } from './core/use-cases/update/update-program.use-case'
import { UpdateProgramDayUseCase } from './core/use-cases/update-day/update-program-day.use-case'
import { ProgramDayEntity } from './core/entity/program-day.entity'
import { ProgramEntity } from './core/entity/program.entity'
import { ProgramTypeormRepository } from './infrastructure/program.typeorm-repository'

@Module({
  imports: [
    AuthModule,
    TemplateModule,
    TrainingModule,
    TypeOrmModule.forFeature([ProgramEntity, ProgramDayEntity]),
  ],
  controllers: [ProgramHttpController],
  providers: [
    ProgramTypeormRepository,
    {
      provide: PROGRAM_REPOSITORY_PORT,
      useExisting: ProgramTypeormRepository,
    },
    {
      provide: ListProgramsUseCase,
      useFactory: (repo: ProgramTypeormRepository) => new ListProgramsUseCase(repo),
      inject: [ProgramTypeormRepository],
    },
    {
      provide: GetProgramUseCase,
      useFactory: (repo: ProgramTypeormRepository) => new GetProgramUseCase(repo),
      inject: [ProgramTypeormRepository],
    },
    {
      provide: CreateProgramUseCase,
      useFactory: (repo: ProgramTypeormRepository) => new CreateProgramUseCase(repo),
      inject: [ProgramTypeormRepository],
    },
    {
      provide: UpdateProgramUseCase,
      useFactory: (repo: ProgramTypeormRepository) => new UpdateProgramUseCase(repo),
      inject: [ProgramTypeormRepository],
    },
    {
      provide: DeleteProgramUseCase,
      useFactory: (repo: ProgramTypeormRepository) => new DeleteProgramUseCase(repo),
      inject: [ProgramTypeormRepository],
    },
    {
      provide: CreateProgramDayUseCase,
      useFactory: (repo: ProgramTypeormRepository) => new CreateProgramDayUseCase(repo),
      inject: [ProgramTypeormRepository],
    },
    {
      provide: UpdateProgramDayUseCase,
      useFactory: (repo: ProgramTypeormRepository) => new UpdateProgramDayUseCase(repo),
      inject: [ProgramTypeormRepository],
    },
    {
      provide: DeleteProgramDayUseCase,
      useFactory: (repo: ProgramTypeormRepository) => new DeleteProgramDayUseCase(repo),
      inject: [ProgramTypeormRepository],
    },
    {
      provide: ApplyProgramUseCase,
      useFactory: (
        programRepo: ProgramTypeormRepository,
        trainingRepo: TrainingTypeormRepository,
        templateRepo: TemplateTypeormRepository,
      ) => new ApplyProgramUseCase(programRepo, trainingRepo, templateRepo),
      inject: [ProgramTypeormRepository, TrainingTypeormRepository, TemplateTypeormRepository],
    },
  ],
  exports: [PROGRAM_REPOSITORY_PORT, ListProgramsUseCase, GetProgramUseCase],
})
export class ProgramModule {}
