import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { ProgramModule } from '../program/program.module'
import { TrainingModule } from '../training/training.module'
import { CoachHttpController } from './controller/coach.http-controller'
import { CoachService } from './core/coach.service'
import { CoachInviteEntity } from './core/entity/coach-invite.entity'
import { CoachRelationshipEntity } from './core/entity/coach-relationship.entity'
import { ProgramAssignmentEntity } from './core/entity/program-assignment.entity'
import { TrainingSetCommentEntity } from './core/entity/training-set-comment.entity'

@Module({
  imports: [
    AuthModule,
    ProgramModule,
    TrainingModule,
    TypeOrmModule.forFeature([
      CoachInviteEntity,
      CoachRelationshipEntity,
      ProgramAssignmentEntity,
      TrainingSetCommentEntity,
    ]),
  ],
  controllers: [CoachHttpController],
  providers: [CoachService],
})
export class CoachModule {}
