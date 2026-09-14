import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'

import { AUTH_REPOSITORY_PORT, AuthRepositoryPort } from '../../auth/core/ports/auth-repository.port'
import { InstallSnapshotService } from '../../program/core/lib/install-snapshot.service'
import { ApplyProgramUseCase } from '../../program/core/use-cases/apply/apply-program.use-case'
import { ProgramTypeormRepository } from '../../program/infrastructure/program.typeorm-repository'
import { TrainingTypeormRepository } from '../../training/infrastructure/training.typeorm-repository'
import { CoachInviteEntity } from './entity/coach-invite.entity'
import { CoachRelationshipEntity } from './entity/coach-relationship.entity'
import { ProgramAssignmentEntity } from './entity/program-assignment.entity'
import { TrainingSetCommentEntity } from './entity/training-set-comment.entity'
import { generateInviteCode, normalizeInviteCode } from './lib/generate-invite-code'

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MAX_ACTIVE_INVITES = 5
const COMMENT_MAX = 500

export type CoachPerson = {
  id: string
  relationshipId: string
  username: string
  email: string
  since: string
}

export type SetCommentView = {
  id: string
  setId: string
  authorId: string
  authorUsername: string
  body: string
  createdAt: string
}

@Injectable()
export class CoachService {
  constructor(
    @InjectRepository(CoachInviteEntity)
    private readonly invites: Repository<CoachInviteEntity>,
    @InjectRepository(CoachRelationshipEntity)
    private readonly relationships: Repository<CoachRelationshipEntity>,
    @InjectRepository(ProgramAssignmentEntity)
    private readonly assignments: Repository<ProgramAssignmentEntity>,
    @InjectRepository(TrainingSetCommentEntity)
    private readonly comments: Repository<TrainingSetCommentEntity>,
    @Inject(AUTH_REPOSITORY_PORT) private readonly users: AuthRepositoryPort,
    private readonly programs: ProgramTypeormRepository,
    private readonly trainings: TrainingTypeormRepository,
    private readonly installer: InstallSnapshotService,
    private readonly applyProgram: ApplyProgramUseCase,
  ) {}

  async createInvite(coachId: string) {
    const active = await this.invites.count({
      where: { coachId, revokedAt: IsNull() },
    })
    if (active >= MAX_ACTIVE_INVITES) {
      throw new BadRequestException('Слишком много активных приглашений — отзовите старые')
    }

    const entity = this.invites.create({
      coachId,
      code: generateInviteCode(),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    })
    const saved = await this.invites.save(entity)
    return this.mapInvite(saved)
  }

  async listInvites(coachId: string) {
    const items = await this.invites.find({
      where: { coachId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    })
    return items.filter((item) => item.expiresAt.getTime() > Date.now()).map((item) => this.mapInvite(item))
  }

  async revokeInvite(coachId: string, inviteId: string) {
    const invite = await this.invites.findOne({ where: { id: inviteId, coachId, revokedAt: IsNull() } })
    if (!invite) throw new NotFoundException('Приглашение не найдено')
    invite.revokedAt = new Date()
    await this.invites.save(invite)
    return { revoked: true }
  }

  async join(traineeId: string, rawCode: string) {
    const code = normalizeInviteCode(rawCode)
    if (!code) throw new BadRequestException('Введите код приглашения')

    const invite = await this.invites.findOne({ where: { code, revokedAt: IsNull() } })
    if (!invite || invite.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('Код недействителен или истёк')
    }
    if (invite.coachId === traineeId) {
      throw new BadRequestException('Нельзя принять своё приглашение')
    }

    const existing = await this.relationships.findOne({
      where: { coachId: invite.coachId, traineeId, endedAt: IsNull() },
    })
    if (existing) {
      return this.mapPerson(existing, 'coach')
    }

    const saved = await this.relationships.save(
      this.relationships.create({
        coachId: invite.coachId,
        traineeId,
      }),
    )
    return this.mapPerson(saved, 'coach')
  }

  async listTrainees(coachId: string): Promise<CoachPerson[]> {
    const rows = await this.relationships.find({
      where: { coachId, endedAt: IsNull() },
      order: { createdAt: 'DESC' },
    })
    return Promise.all(rows.map((row) => this.mapPerson(row, 'trainee')))
  }

  async listCoaches(traineeId: string): Promise<CoachPerson[]> {
    const rows = await this.relationships.find({
      where: { traineeId, endedAt: IsNull() },
      order: { createdAt: 'DESC' },
    })
    return Promise.all(rows.map((row) => this.mapPerson(row, 'coach')))
  }

  async endRelationship(userId: string, relationshipId: string) {
    const row = await this.relationships.findOne({ where: { id: relationshipId, endedAt: IsNull() } })
    if (!row) throw new NotFoundException('Связь не найдена')
    if (row.coachId !== userId && row.traineeId !== userId) {
      throw new ForbiddenException('Нельзя завершить чужую связь')
    }
    row.endedAt = new Date()
    await this.relationships.save(row)
    return { ended: true }
  }

  async assignProgram(coachId: string, traineeId: string, sourceProgramId: string, weekStart?: string) {
    await this.requireCoachOf(coachId, traineeId)
    const snapshot = await this.installer.snapshotProgram(sourceProgramId)
    const owned = await this.programs.getById(sourceProgramId, coachId)
    if (!owned || !snapshot) throw new NotFoundException('Программа не найдена')

    const installed = await this.installer.installProgram(traineeId, snapshot)
    if (!installed.program) throw new BadRequestException('Не удалось назначить программу')

    const assignment = await this.assignments.save(
      this.assignments.create({
        coachId,
        traineeId,
        sourceProgramId,
        traineeProgramId: installed.program.id,
        status: 'active',
      }),
    )

    let applied: { created: number; skipped: number } | undefined
    if (weekStart) {
      const result = await this.applyProgram.execute({
        id: installed.program.id,
        userId: traineeId,
        weekStart,
      })
      applied = { created: result.created.length, skipped: result.skipped }
    }

    return {
      assignmentId: assignment.id,
      traineeProgramId: installed.program.id,
      skippedExercises: installed.skippedExercises,
      applied,
    }
  }

  async listAssignments(coachId: string, traineeId: string) {
    await this.requireCoachOf(coachId, traineeId)
    const items = await this.assignments.find({
      where: { coachId, traineeId },
      order: { createdAt: 'DESC' },
    })
    return items.map((item) => ({
      id: item.id,
      sourceProgramId: item.sourceProgramId,
      traineeProgramId: item.traineeProgramId,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    }))
  }

  async listTraineeTrainings(coachId: string, traineeId: string, from?: string, to?: string) {
    await this.requireCoachOf(coachId, traineeId)
    return this.trainings.list({
      userId: traineeId,
      page: 1,
      limit: 100,
      from,
      to,
    })
  }

  async getTraineeTraining(coachId: string, traineeId: string, trainingId: string) {
    await this.requireCoachOf(coachId, traineeId)
    const training = await this.trainings.getById(trainingId, traineeId)
    if (!training) throw new NotFoundException('Тренировка не найдена')
    const comments = await this.listCommentsForTraining(trainingId)
    return { training, comments }
  }

  async listComments(userId: string, trainingId: string): Promise<SetCommentView[]> {
    const training = await this.trainings.getByIdAny(trainingId)
    if (!training) throw new NotFoundException('Тренировка не найдена')
    const allowed =
      training.userId === userId || (await this.isCoachOf(userId, training.userId))
    if (!allowed) throw new ForbiddenException('Нет доступа к комментариям')
    return this.listCommentsForTraining(trainingId)
  }

  async addComment(authorId: string, setId: string, body: string): Promise<SetCommentView> {
    const text = body.trim()
    if (!text) throw new BadRequestException('Комментарий пустой')
    if (text.length > COMMENT_MAX) {
      throw new BadRequestException(`Комментарий длиннее ${COMMENT_MAX} символов`)
    }

    const context = await this.trainings.findSetContext(setId)
    if (!context) throw new NotFoundException('Подход не найден')
    await this.requireCoachOf(authorId, context.userId)

    const saved = await this.comments.save(
      this.comments.create({
        setId,
        authorId,
        body: text,
      }),
    )
    const author = await this.users.findUserById(authorId)
    return {
      id: saved.id,
      setId: saved.setId,
      authorId: saved.authorId,
      authorUsername: author?.username ?? 'Тренер',
      body: saved.body,
      createdAt: saved.createdAt.toISOString(),
    }
  }

  private async listCommentsForTraining(trainingId: string): Promise<SetCommentView[]> {
    const rows = await this.comments
      .createQueryBuilder('c')
      .innerJoin('training_sets', 's', 's.id = c.set_id')
      .innerJoin('training_exercises', 'e', 'e.id = s.training_exercise_id')
      .innerJoin('users', 'u', 'u.id = c.author_id')
      .select('c.id', 'id')
      .addSelect('c.set_id', 'set_id')
      .addSelect('c.author_id', 'author_id')
      .addSelect('u.username', 'author_username')
      .addSelect('c.body', 'body')
      .addSelect('c.created_at', 'created_at')
      .where('e.training_id = :trainingId', { trainingId })
      .orderBy('c.created_at', 'ASC')
      .getRawMany<{
        id: string
        set_id: string
        author_id: string
        author_username: string
        body: string
        created_at: Date
      }>()

    return rows.map((row) => ({
      id: row.id,
      setId: row.set_id,
      authorId: row.author_id,
      authorUsername: row.author_username,
      body: row.body,
      createdAt: new Date(row.created_at).toISOString(),
    }))
  }

  private async requireCoachOf(coachId: string, traineeId: string) {
    if (!(await this.isCoachOf(coachId, traineeId))) {
      throw new ForbiddenException('Этот человек не ваш подопечный')
    }
  }

  private async isCoachOf(coachId: string, traineeId: string): Promise<boolean> {
    const row = await this.relationships.findOne({
      where: { coachId, traineeId, endedAt: IsNull() },
    })
    return Boolean(row)
  }

  private mapInvite(entity: CoachInviteEntity) {
    return {
      id: entity.id,
      code: entity.code,
      createdAt: entity.createdAt.toISOString(),
      expiresAt: entity.expiresAt.toISOString(),
    }
  }

  private async mapPerson(
    row: CoachRelationshipEntity,
    side: 'coach' | 'trainee',
  ): Promise<CoachPerson> {
    const userId = side === 'coach' ? row.coachId : row.traineeId
    const user = await this.users.findUserById(userId)
    return {
      id: userId,
      relationshipId: row.id,
      username: user?.username ?? 'Пользователь',
      email: user?.email ?? '',
      since: row.createdAt.toISOString(),
    }
  }
}
