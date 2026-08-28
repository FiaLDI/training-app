import { areExerciseOrdersContiguous, groupTypeFromMemberCount } from '../../../common/core/exercise-group'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  AddExerciseToTrainingGroupRepositoryInput,
  CreateTrainingExerciseGroupRepositoryInput,
  CreateTrainingExerciseRepositoryInput,
  CreateTrainingRepositoryInput,
  CreateTrainingSetRepositoryInput,
  ExerciseProgressRepositoryInput,
  ListTrainingsRepositoryInput,
  ListTrainingsRepositoryOutput,
  TrainingRepositoryPort,
  UpdateTrainingExerciseGroupRepositoryInput,
  UpdateTrainingExerciseRepositoryInput,
  UpdateTrainingRepositoryInput,
  UpdateTrainingSetRepositoryInput,
  VolumeStatsRepositoryInput,
} from '../core/ports/training-repository.port'
import {
  ActivityStatPoint,
  ExerciseProgressPoint,
  MuscleGroupVolumeRow,
  Training,
  TrainingExercise,
  TrainingExerciseGroup,
  TrainingSet,
  TrainingStatus,
  TrainingWithDetails,
  VolumeStatPoint,
} from '../core/types'
import { TrainingExerciseGroupEntity } from '../core/entity/training-exercise-group.entity'
import { TrainingExerciseEntity } from '../core/entity/training-exercise.entity'
import { TrainingSetEntity } from '../core/entity/training-set.entity'
import { TrainingEntity } from '../core/entity/training.entity'

@Injectable()
export class TrainingTypeormRepository implements TrainingRepositoryPort {
  constructor(
    @InjectRepository(TrainingEntity)
    private readonly trainings: Repository<TrainingEntity>,
    @InjectRepository(TrainingExerciseEntity)
    private readonly trainingExercises: Repository<TrainingExerciseEntity>,
    @InjectRepository(TrainingSetEntity)
    private readonly trainingSets: Repository<TrainingSetEntity>,
    @InjectRepository(TrainingExerciseGroupEntity)
    private readonly trainingGroups: Repository<TrainingExerciseGroupEntity>,
  ) {}

  private mapTraining(entity: TrainingEntity): Training {
    return {
      id: entity.id,
      userId: entity.userId,
      templateId: entity.templateId,
      programId: entity.programId,
      programDayId: entity.programDayId,
      status: entity.status as TrainingStatus,
      scheduledAt: entity.scheduledAt ? entity.scheduledAt.toISOString() : null,
      startedAt: entity.startedAt ? entity.startedAt.toISOString() : null,
      finishedAt: entity.finishedAt ? entity.finishedAt.toISOString() : null,
      notes: entity.notes,
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
    }
  }

  private mapGroup(entity: TrainingExerciseGroupEntity): TrainingExerciseGroup {
    return {
      id: entity.id,
      trainingId: entity.trainingId,
      type: entity.type as TrainingExerciseGroup['type'],
      groupOrder: entity.groupOrder,
      restSeconds: entity.restSeconds,
      metadata: entity.metadata ?? {},
    }
  }

  private mapExercise(entity: TrainingExerciseEntity): TrainingExercise {
    return {
      id: entity.id,
      trainingId: entity.trainingId,
      exerciseId: entity.exerciseId,
      exerciseOrder: entity.exerciseOrder,
      targetSets: entity.targetSets,
      isWarmup: entity.isWarmup ?? false,
      minReps: entity.minReps,
      maxReps: entity.maxReps,
      maxWeight: entity.maxWeight == null ? null : Number(entity.maxWeight),
      previousMaxWeight: entity.previousMaxWeight == null ? null : Number(entity.previousMaxWeight),
      restSeconds: entity.restSeconds,
      notes: entity.notes,
      groupId: entity.groupId,
      positionInGroup: entity.positionInGroup,
      metadata: entity.metadata ?? {},
    }
  }

  private mapSet(entity: TrainingSetEntity): TrainingSet {
    return {
      id: entity.id,
      trainingExerciseId: entity.trainingExerciseId,
      setNumber: entity.setNumber,
      weight: entity.weight === null ? null : Number(entity.weight),
      reps: entity.reps,
      rir: entity.rir,
      rpe: entity.rpe === null ? null : Number(entity.rpe),
      completed: entity.completed,
      isWarmup: entity.isWarmup ?? false,
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
    }
  }

  private async ownsTraining(trainingId: string, userId: string): Promise<boolean> {
    const count = await this.trainings.count({ where: { id: trainingId, userId } })
    return count > 0
  }

  private async findOwnedExercise(
    exerciseId: string,
    userId: string,
  ): Promise<TrainingExerciseEntity | null> {
    const entity = await this.trainingExercises.findOne({ where: { id: exerciseId } })
    if (!entity) return null
    const owns = await this.ownsTraining(entity.trainingId, userId)
    return owns ? entity : null
  }

  private async findOwnedSet(
    setId: string,
    userId: string,
  ): Promise<TrainingSetEntity | null> {
    const entity = await this.trainingSets.findOne({ where: { id: setId } })
    if (!entity) return null
    const exercise = await this.findOwnedExercise(entity.trainingExerciseId, userId)
    return exercise ? entity : null
  }

  async list(input: ListTrainingsRepositoryInput): Promise<ListTrainingsRepositoryOutput> {
    const qb = this.trainings
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId: input.userId })

    if (input.status) {
      qb.andWhere('t.status = :status', { status: input.status })
    }

    if (input.from) {
      qb.andWhere('COALESCE(t.scheduled_at, t.started_at, t.created_at) >= :from', {
        from: new Date(input.from),
      })
    }

    if (input.to) {
      qb.andWhere('COALESCE(t.scheduled_at, t.started_at, t.created_at) <= :to', {
        to: new Date(input.to),
      })
    }

    qb.orderBy('t.created_at', 'DESC')
      .skip((input.page - 1) * input.limit)
      .take(input.limit)

    const [items, total] = await qb.getManyAndCount()

    return {
      items: items.map((item) => this.mapTraining(item)),
      total,
      page: input.page,
      limit: input.limit,
    }
  }

  async getById(id: string, userId: string): Promise<TrainingWithDetails | null> {
    const entity = await this.trainings.findOne({ where: { id, userId } })
    if (!entity) return null

    const exercises = await this.trainingExercises.find({
      where: { trainingId: id },
      order: { exerciseOrder: 'ASC' },
    })

    const mappedExercises = []
    for (const exercise of exercises) {
      const sets = await this.trainingSets.find({
        where: { trainingExerciseId: exercise.id },
        order: { setNumber: 'ASC' },
      })
      mappedExercises.push({
        ...this.mapExercise(exercise),
        sets: sets.map((set) => this.mapSet(set)),
      })
    }

    return {
      ...this.mapTraining(entity),
      groups: await this.listGroups(id),
      exercises: mappedExercises,
    }
  }

  async create(input: CreateTrainingRepositoryInput): Promise<Training> {
    if (input.id) {
      const existing = await this.trainings.findOne({
        where: { id: input.id, userId: input.userId },
      })
      if (existing) return this.mapTraining(existing)
    }

    const entity = this.trainings.create({
      ...(input.id ? { id: input.id } : {}),
      userId: input.userId,
      templateId: input.templateId ?? null,
      programId: input.programId ?? null,
      programDayId: input.programDayId ?? null,
      status: input.status,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
      finishedAt: input.finishedAt ? new Date(input.finishedAt) : null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    })
    return this.mapTraining(await this.trainings.save(entity))
  }

  async update(input: UpdateTrainingRepositoryInput): Promise<Training | null> {
    const entity = await this.trainings.findOne({ where: { id: input.id, userId: input.userId } })
    if (!entity) return null

    if (input.status !== undefined) entity.status = input.status
    if (input.scheduledAt !== undefined) {
      entity.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
    }
    if (input.startedAt !== undefined) {
      entity.startedAt = input.startedAt ? new Date(input.startedAt) : null
    }
    if (input.finishedAt !== undefined) {
      entity.finishedAt = input.finishedAt ? new Date(input.finishedAt) : null
    }
    if (input.notes !== undefined) entity.notes = input.notes
    if (input.metadata !== undefined) entity.metadata = input.metadata
    if (input.programId !== undefined) entity.programId = input.programId
    if (input.programDayId !== undefined) entity.programDayId = input.programDayId
    if (input.templateId !== undefined) entity.templateId = input.templateId

    return this.mapTraining(await this.trainings.save(entity))
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.trainings.delete({ id, userId })
    return (result.affected ?? 0) > 0
  }

  async findActiveByProgramDay(
    userId: string,
    programDayId: string,
    scheduledAt: string,
  ): Promise<Training | null> {
    const dayStart = new Date(scheduledAt)
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

    // Include cancelled: week-specific "rest" must block re-apply for that date.
    const entity = await this.trainings
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.program_day_id = :programDayId', { programDayId })
      .andWhere('t.scheduled_at >= :dayStart AND t.scheduled_at < :dayEnd', {
        dayStart,
        dayEnd,
      })
      .orderBy('t.created_at', 'DESC')
      .getOne()

    return entity ? this.mapTraining(entity) : null
  }

  async findActiveOnScheduledDate(
    userId: string,
    scheduledAt: string,
  ): Promise<Training | null> {
    const dayStart = new Date(scheduledAt)
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

    const entity = await this.trainings
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('t.scheduled_at >= :dayStart AND t.scheduled_at < :dayEnd', {
        dayStart,
        dayEnd,
      })
      .orderBy('t.created_at', 'DESC')
      .getOne()

    return entity ? this.mapTraining(entity) : null
  }

  async createExercise(
    input: CreateTrainingExerciseRepositoryInput,
  ): Promise<TrainingExercise | null> {
    if (input.id) {
      const existing = await this.findOwnedExercise(input.id, input.userId)
      if (existing) return this.mapExercise(existing)
    }

    if (!(await this.ownsTraining(input.trainingId, input.userId))) return null

    const previousMaxWeight =
      input.previousMaxWeight !== undefined && input.previousMaxWeight !== null
        ? input.previousMaxWeight
        : await this.findPreviousMaxWeight(input.userId, input.exerciseId, input.trainingId)

    const entity = this.trainingExercises.create({
      ...(input.id ? { id: input.id } : {}),
      trainingId: input.trainingId,
      exerciseId: input.exerciseId,
      exerciseOrder: input.exerciseOrder,
      targetSets: input.targetSets,
      isWarmup: input.isWarmup ?? false,
      minReps: input.minReps ?? null,
      maxReps: input.maxReps ?? null,
      maxWeight: input.maxWeight == null ? null : String(input.maxWeight),
      previousMaxWeight: previousMaxWeight == null ? null : String(previousMaxWeight),
      restSeconds: input.restSeconds ?? null,
      notes: input.notes ?? null,
      groupId: input.groupId ?? null,
      positionInGroup: input.positionInGroup ?? null,
      metadata: input.metadata ?? {},
    })
    return this.mapExercise(await this.trainingExercises.save(entity))
  }

  async updateExercise(
    input: UpdateTrainingExerciseRepositoryInput,
  ): Promise<TrainingExercise | null> {
    const entity = await this.findOwnedExercise(input.id, input.userId)
    if (!entity) return null

    if (input.exerciseOrder !== undefined) entity.exerciseOrder = input.exerciseOrder
    if (input.targetSets !== undefined) entity.targetSets = input.targetSets
    if (input.isWarmup !== undefined) entity.isWarmup = input.isWarmup
    if (input.minReps !== undefined) entity.minReps = input.minReps
    if (input.maxReps !== undefined) entity.maxReps = input.maxReps
    if (input.maxWeight !== undefined) {
      entity.maxWeight = input.maxWeight == null ? null : String(input.maxWeight)
    }
    if (input.previousMaxWeight !== undefined) {
      entity.previousMaxWeight =
        input.previousMaxWeight == null ? null : String(input.previousMaxWeight)
    }
    if (input.restSeconds !== undefined) entity.restSeconds = input.restSeconds
    if (input.notes !== undefined) entity.notes = input.notes
    if (input.groupId !== undefined) entity.groupId = input.groupId
    if (input.positionInGroup !== undefined) entity.positionInGroup = input.positionInGroup
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapExercise(await this.trainingExercises.save(entity))
  }

  async deleteExercise(id: string, userId: string): Promise<boolean> {
    const entity = await this.findOwnedExercise(id, userId)
    if (!entity) return false

    if (entity.groupId) {
      const groupId = entity.groupId
      const partners = await this.trainingExercises.find({ where: { groupId } })
      for (const partner of partners) {
        if (partner.id === entity.id) continue
        partner.groupId = null
        partner.positionInGroup = null
        await this.trainingExercises.save(partner)
      }
      await this.trainingGroups.delete(groupId)
    }

    const result = await this.trainingExercises.delete(id)
    return (result.affected ?? 0) > 0
  }

  async listGroups(trainingId: string): Promise<TrainingExerciseGroup[]> {
    const items = await this.trainingGroups.find({
      where: { trainingId },
      order: { groupOrder: 'ASC' },
    })
    return items.map((item) => this.mapGroup(item))
  }

  async createGroup(
    input: CreateTrainingExerciseGroupRepositoryInput,
  ): Promise<TrainingExerciseGroup | null> {
    if (input.id) {
      const existing = await this.trainingGroups.findOne({ where: { id: input.id } })
      if (existing && (await this.ownsTraining(existing.trainingId, input.userId))) {
        return this.mapGroup(existing)
      }
    }

    if (!(await this.ownsTraining(input.trainingId, input.userId))) return null

    const resolved = await Promise.all(
      input.exerciseIds.map((id) => this.findOwnedExercise(id, input.userId)),
    )
    if (resolved.some((item) => !item)) return null

    const exercises = resolved.filter((item): item is NonNullable<typeof item> => item != null)
    if (exercises.some((item) => item.trainingId !== input.trainingId)) return null

    const alreadyGrouped = exercises.filter((item) => item.groupId)
    if (alreadyGrouped.length > 0) {
      if (
        input.id &&
        alreadyGrouped.length === exercises.length &&
        alreadyGrouped.every((item) => item.groupId === input.id)
      ) {
        const existing = await this.trainingGroups.findOne({ where: { id: input.id } })
        if (existing) return this.mapGroup(existing)
      }
      return null
    }

    const orders = exercises.map((item) => item.exerciseOrder)
    if (!areExerciseOrdersContiguous(orders)) return null

    const sorted = [...exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)
    const syncedTargetSets = Math.max(...sorted.map((item) => item.targetSets))
    const memberCount = sorted.length

    const groupEntity = this.trainingGroups.create({
      ...(input.id ? { id: input.id } : {}),
      trainingId: input.trainingId,
      type: input.type ?? groupTypeFromMemberCount(memberCount),
      groupOrder: input.groupOrder,
      restSeconds: input.restSeconds ?? null,
      metadata: input.metadata ?? {},
    })
    const savedGroup = await this.trainingGroups.save(groupEntity)

    for (let i = 0; i < sorted.length; i += 1) {
      sorted[i].groupId = savedGroup.id
      sorted[i].positionInGroup = i
      sorted[i].targetSets = syncedTargetSets
    }
    await this.trainingExercises.save(sorted)

    return this.mapGroup(savedGroup)
  }

  async addExerciseToGroup(
    input: AddExerciseToTrainingGroupRepositoryInput,
  ): Promise<TrainingExerciseGroup | null> {
    const group = await this.trainingGroups.findOne({ where: { id: input.groupId } })
    if (!group || !(await this.ownsTraining(group.trainingId, input.userId))) return null

    const exercise = await this.findOwnedExercise(input.exerciseId, input.userId)
    if (!exercise || exercise.trainingId !== group.trainingId) return null
    if (exercise.groupId === group.id) return this.mapGroup(group)
    if (exercise.groupId) return null

    const members = await this.trainingExercises.find({
      where: { groupId: group.id },
      order: { positionInGroup: 'ASC' },
    })
    const maxOrder = Math.max(...members.map((item) => item.exerciseOrder))
    if (exercise.exerciseOrder !== maxOrder + 1) return null

    const syncedTargetSets = Math.max(...members.map((item) => item.targetSets), exercise.targetSets)
    exercise.groupId = group.id
    exercise.positionInGroup = members.length
    exercise.targetSets = syncedTargetSets
    await this.trainingExercises.save(exercise)

    for (const member of members) {
      member.targetSets = syncedTargetSets
    }
    await this.trainingExercises.save(members)

    group.type = groupTypeFromMemberCount(members.length + 1)
    return this.mapGroup(await this.trainingGroups.save(group))
  }

  async updateGroup(
    input: UpdateTrainingExerciseGroupRepositoryInput,
  ): Promise<TrainingExerciseGroup | null> {
    const entity = await this.trainingGroups.findOne({ where: { id: input.id } })
    if (!entity) return null
    if (!(await this.ownsTraining(entity.trainingId, input.userId))) return null

    if (input.restSeconds !== undefined) entity.restSeconds = input.restSeconds
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapGroup(await this.trainingGroups.save(entity))
  }

  async deleteGroup(id: string, userId: string): Promise<boolean> {
    const entity = await this.trainingGroups.findOne({ where: { id } })
    if (!entity) return false
    if (!(await this.ownsTraining(entity.trainingId, userId))) return false

    const members = await this.trainingExercises.find({ where: { groupId: id } })
    for (const member of members) {
      member.groupId = null
      member.positionInGroup = null
      await this.trainingExercises.save(member)
    }

    const result = await this.trainingGroups.delete(id)
    return (result.affected ?? 0) > 0
  }

  async fillMissingPreviousMaxWeights(trainingId: string, userId: string): Promise<void> {
    if (!(await this.ownsTraining(trainingId, userId))) return

    const exercises = await this.trainingExercises.find({ where: { trainingId } })
    for (const exercise of exercises) {
      const previous = await this.findPreviousMaxWeight(userId, exercise.exerciseId, trainingId)
      if (previous == null) continue
      exercise.previousMaxWeight = String(previous)
      await this.trainingExercises.save(exercise)
    }
  }

  async snapshotSessionMaxWeights(trainingId: string, userId: string): Promise<void> {
    if (!(await this.ownsTraining(trainingId, userId))) return

    await this.trainings.manager.query(
      `
      UPDATE training_exercises AS te
      SET max_weight = sub.max_weight
      FROM (
        SELECT
          te2.id AS exercise_id,
          MAX(ts.weight)::numeric(8,2) AS max_weight
        FROM training_exercises te2
        LEFT JOIN training_sets ts
          ON ts.training_exercise_id = te2.id
          AND COALESCE(ts.is_warmup, false) = false
          AND ts.completed = true
          AND ts.weight IS NOT NULL
        WHERE te2.training_id = $1
          AND COALESCE(te2.is_warmup, false) = false
        GROUP BY te2.id
      ) AS sub
      WHERE te.id = sub.exercise_id
      `,
      [trainingId],
    )
  }

  private async findPreviousMaxWeight(
    userId: string,
    exerciseId: string,
    excludeTrainingId: string,
  ): Promise<number | null> {
    const rows = await this.trainings.manager.query(
      `
      SELECT prev_te.max_weight
      FROM training_exercises AS prev_te
      INNER JOIN trainings AS prev_t ON prev_t.id = prev_te.training_id
      INNER JOIN trainings AS current_t ON current_t.id = $3
      WHERE prev_t.user_id = $1
        AND prev_te.exercise_id = $2
        AND prev_t.id <> $3
        AND prev_t.status = 'finished'
        AND prev_te.max_weight IS NOT NULL
        AND COALESCE(prev_t.finished_at, prev_t.started_at, prev_t.scheduled_at, prev_t.created_at)
          < COALESCE(current_t.finished_at, current_t.started_at, current_t.scheduled_at, current_t.created_at)
      ORDER BY COALESCE(prev_t.finished_at, prev_t.started_at, prev_t.scheduled_at, prev_t.created_at) DESC
      LIMIT 1
      `,
      [userId, exerciseId, excludeTrainingId],
    )

    const value = rows[0]?.max_weight
    return value == null ? null : Number(value)
  }

  async createSet(input: CreateTrainingSetRepositoryInput): Promise<TrainingSet | null> {
    if (input.id) {
      const existing = await this.findOwnedSet(input.id, input.userId)
      if (existing) return this.mapSet(existing)
    }

    const exercise = await this.findOwnedExercise(input.trainingExerciseId, input.userId)
    if (!exercise) return null

    const entity = this.trainingSets.create({
      ...(input.id ? { id: input.id } : {}),
      trainingExerciseId: input.trainingExerciseId,
      setNumber: input.setNumber,
      weight: input.weight === undefined || input.weight === null ? null : String(input.weight),
      reps: input.reps ?? null,
      rir: input.rir ?? null,
      rpe: input.rpe === undefined || input.rpe === null ? null : String(input.rpe),
      completed: input.completed ?? true,
      isWarmup: input.isWarmup ?? false,
      metadata: input.metadata ?? {},
    })
    return this.mapSet(await this.trainingSets.save(entity))
  }

  async updateSet(input: UpdateTrainingSetRepositoryInput): Promise<TrainingSet | null> {
    const entity = await this.findOwnedSet(input.id, input.userId)
    if (!entity) return null

    if (input.setNumber !== undefined) entity.setNumber = input.setNumber
    if (input.weight !== undefined) {
      entity.weight = input.weight === null ? null : String(input.weight)
    }
    if (input.reps !== undefined) entity.reps = input.reps
    if (input.rir !== undefined) entity.rir = input.rir
    if (input.rpe !== undefined) {
      entity.rpe = input.rpe === null ? null : String(input.rpe)
    }
    if (input.completed !== undefined) entity.completed = input.completed
    if (input.isWarmup !== undefined) entity.isWarmup = input.isWarmup
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapSet(await this.trainingSets.save(entity))
  }

  async deleteSet(id: string, userId: string): Promise<boolean> {
    const entity = await this.findOwnedSet(id, userId)
    if (!entity) return false
    const result = await this.trainingSets.delete(id)
    return (result.affected ?? 0) > 0
  }

  async getVolumeStats(input: VolumeStatsRepositoryInput): Promise<VolumeStatPoint[]> {
    const rows = await this.trainings.manager.query(
      `
      SELECT
        to_char(DATE(COALESCE(t.started_at, t.scheduled_at, t.created_at)), 'YYYY-MM-DD') AS date,
        COALESCE(SUM(
          CASE
            WHEN COALESCE(ts.is_warmup, false) = false
              AND COALESCE(te.is_warmup, false) = false
              AND ts.completed = true
              AND ts.weight IS NOT NULL
              AND ts.reps IS NOT NULL
            THEN ts.weight::numeric * ts.reps
            ELSE 0
          END
        ), 0)::float AS volume
      FROM trainings t
      LEFT JOIN training_exercises te ON te.training_id = t.id
      LEFT JOIN training_sets ts ON ts.training_exercise_id = te.id
      WHERE t.user_id = $1
        AND t.status IN ('finished', 'in_progress')
        AND COALESCE(t.started_at, t.scheduled_at, t.created_at) >= $2::timestamptz
        AND COALESCE(t.started_at, t.scheduled_at, t.created_at) <= $3::timestamptz
      GROUP BY DATE(COALESCE(t.started_at, t.scheduled_at, t.created_at))
      HAVING COALESCE(SUM(
          CASE
            WHEN COALESCE(ts.is_warmup, false) = false
              AND COALESCE(te.is_warmup, false) = false
              AND ts.completed = true
              AND ts.weight IS NOT NULL
              AND ts.reps IS NOT NULL
            THEN ts.weight::numeric * ts.reps
            ELSE 0
          END
        ), 0) > 0
      ORDER BY DATE(COALESCE(t.started_at, t.scheduled_at, t.created_at)) ASC
      `,
      [input.userId, input.from, input.to],
    )

    return rows.map((row: { date: string; volume: number | string }) => ({
      date: row.date,
      volume: Number(row.volume) || 0,
    }))
  }

  async getExerciseProgress(
    input: ExerciseProgressRepositoryInput,
  ): Promise<ExerciseProgressPoint[]> {
    const rows = await this.trainings.manager.query(
      `
      SELECT
        to_char(DATE(COALESCE(t.started_at, t.scheduled_at, t.created_at)), 'YYYY-MM-DD') AS date,
        MAX(CASE WHEN COALESCE(ts.is_warmup, false) = false AND COALESCE(te.is_warmup, false) = false AND ts.completed = true THEN ts.weight::numeric END)::float AS max_weight,
        COALESCE(MAX(
          CASE
            WHEN COALESCE(ts.is_warmup, false) = false
              AND COALESCE(te.is_warmup, false) = false
              AND ts.completed = true
              AND ts.weight IS NOT NULL
              AND ts.reps IS NOT NULL
            THEN ts.weight::numeric * ts.reps
            ELSE 0
          END
        ), 0)::float AS best_volume
      FROM trainings t
      INNER JOIN training_exercises te ON te.training_id = t.id
      LEFT JOIN training_sets ts ON ts.training_exercise_id = te.id
      WHERE t.user_id = $1
        AND te.exercise_id = $2
        AND t.status IN ('finished', 'in_progress')
        AND COALESCE(t.started_at, t.scheduled_at, t.created_at) >= $3::timestamptz
        AND COALESCE(t.started_at, t.scheduled_at, t.created_at) <= $4::timestamptz
      GROUP BY DATE(COALESCE(t.started_at, t.scheduled_at, t.created_at))
      ORDER BY DATE(COALESCE(t.started_at, t.scheduled_at, t.created_at)) ASC
      `,
      [input.userId, input.exerciseId, input.from, input.to],
    )

    return rows.map(
      (row: { date: string; max_weight: number | string | null; best_volume: number | string }) => ({
        date: row.date,
        maxWeight: row.max_weight == null ? null : Number(row.max_weight),
        bestVolume: Number(row.best_volume) || 0,
      }),
    )
  }

  private static readonly WORKING_SET_CONDITION = `
    COALESCE(ts.is_warmup, false) = false
    AND COALESCE(te.is_warmup, false) = false
    AND ts.completed = true
    AND ts.weight IS NOT NULL
    AND ts.reps IS NOT NULL
  `

  async getMuscleGroupVolumeRows(
    input: VolumeStatsRepositoryInput,
  ): Promise<MuscleGroupVolumeRow[]> {
    const rows = await this.trainings.manager.query(
      `
      SELECT
        COALESCE(e.muscle_group, '') AS muscle_group_raw,
        COALESCE(SUM(
          CASE WHEN ${TrainingTypeormRepository.WORKING_SET_CONDITION}
            THEN ts.weight::numeric * ts.reps
            ELSE 0
          END
        ), 0)::float AS volume,
        COUNT(
          CASE WHEN ${TrainingTypeormRepository.WORKING_SET_CONDITION} THEN 1 END
        )::int AS sets
      FROM trainings t
      INNER JOIN training_exercises te ON te.training_id = t.id
      INNER JOIN exercises e ON e.id = te.exercise_id
      LEFT JOIN training_sets ts ON ts.training_exercise_id = te.id
      WHERE t.user_id = $1
        AND t.status IN ('finished', 'in_progress')
        AND COALESCE(t.started_at, t.scheduled_at, t.created_at) >= $2::timestamptz
        AND COALESCE(t.started_at, t.scheduled_at, t.created_at) <= $3::timestamptz
      GROUP BY te.id, e.muscle_group
      HAVING COALESCE(SUM(
          CASE WHEN ${TrainingTypeormRepository.WORKING_SET_CONDITION}
            THEN ts.weight::numeric * ts.reps
            ELSE 0
          END
        ), 0) > 0
        OR COUNT(CASE WHEN ${TrainingTypeormRepository.WORKING_SET_CONDITION} THEN 1 END) > 0
      `,
      [input.userId, input.from, input.to],
    )

    return rows.map(
      (row: { muscle_group_raw: string; volume: number | string; sets: number | string }) => ({
        muscleGroupRaw: row.muscle_group_raw,
        volume: Number(row.volume) || 0,
        sets: Number(row.sets) || 0,
      }),
    )
  }

  async getActivityStats(input: VolumeStatsRepositoryInput): Promise<ActivityStatPoint[]> {
    const rows = await this.trainings.manager.query(
      `
      SELECT
        to_char(DATE(COALESCE(t.started_at, t.scheduled_at, t.created_at)), 'YYYY-MM-DD') AS date,
        COUNT(DISTINCT t.id)::int AS session_count,
        COALESCE(SUM(
          CASE WHEN ${TrainingTypeormRepository.WORKING_SET_CONDITION}
            THEN ts.weight::numeric * ts.reps
            ELSE 0
          END
        ), 0)::float AS volume
      FROM trainings t
      LEFT JOIN training_exercises te ON te.training_id = t.id
      LEFT JOIN training_sets ts ON ts.training_exercise_id = te.id
      WHERE t.user_id = $1
        AND t.status IN ('finished', 'in_progress')
        AND COALESCE(t.started_at, t.scheduled_at, t.created_at) >= $2::timestamptz
        AND COALESCE(t.started_at, t.scheduled_at, t.created_at) <= $3::timestamptz
      GROUP BY DATE(COALESCE(t.started_at, t.scheduled_at, t.created_at))
      ORDER BY DATE(COALESCE(t.started_at, t.scheduled_at, t.created_at)) ASC
      `,
      [input.userId, input.from, input.to],
    )

    return rows.map(
      (row: { date: string; session_count: number | string; volume: number | string }) => ({
        date: row.date,
        sessionCount: Number(row.session_count) || 0,
        volume: Number(row.volume) || 0,
      }),
    )
  }
}
