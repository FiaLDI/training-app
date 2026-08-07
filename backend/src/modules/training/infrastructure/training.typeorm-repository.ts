import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  CreateTrainingExerciseRepositoryInput,
  CreateTrainingRepositoryInput,
  CreateTrainingSetRepositoryInput,
  ListTrainingsRepositoryInput,
  ListTrainingsRepositoryOutput,
  TrainingRepositoryPort,
  UpdateTrainingExerciseRepositoryInput,
  UpdateTrainingRepositoryInput,
  UpdateTrainingSetRepositoryInput,
} from '../core/ports/training-repository.port'
import {
  Training,
  TrainingExercise,
  TrainingSet,
  TrainingStatus,
  TrainingWithDetails,
} from '../core/types'
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
  ) {}

  private mapTraining(entity: TrainingEntity): Training {
    return {
      id: entity.id,
      userId: entity.userId,
      templateId: entity.templateId,
      status: entity.status as TrainingStatus,
      startedAt: entity.startedAt.toISOString(),
      finishedAt: entity.finishedAt ? entity.finishedAt.toISOString() : null,
      notes: entity.notes,
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
    }
  }

  private mapExercise(entity: TrainingExerciseEntity): TrainingExercise {
    return {
      id: entity.id,
      trainingId: entity.trainingId,
      exerciseId: entity.exerciseId,
      exerciseOrder: entity.exerciseOrder,
      targetSets: entity.targetSets,
      minReps: entity.minReps,
      maxReps: entity.maxReps,
      restSeconds: entity.restSeconds,
      notes: entity.notes,
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
    const where = input.status
      ? { userId: input.userId, status: input.status }
      : { userId: input.userId }
    const [items, total] = await this.trainings.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    })

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
      exercises: mappedExercises,
    }
  }

  async create(input: CreateTrainingRepositoryInput): Promise<Training> {
    const entity = this.trainings.create({
      userId: input.userId,
      templateId: input.templateId ?? null,
      status: input.status,
      startedAt: new Date(input.startedAt),
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
    if (input.startedAt !== undefined) entity.startedAt = new Date(input.startedAt)
    if (input.finishedAt !== undefined) {
      entity.finishedAt = input.finishedAt ? new Date(input.finishedAt) : null
    }
    if (input.notes !== undefined) entity.notes = input.notes
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapTraining(await this.trainings.save(entity))
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.trainings.delete({ id, userId })
    return (result.affected ?? 0) > 0
  }

  async createExercise(
    input: CreateTrainingExerciseRepositoryInput,
  ): Promise<TrainingExercise | null> {
    if (!(await this.ownsTraining(input.trainingId, input.userId))) return null

    const entity = this.trainingExercises.create({
      trainingId: input.trainingId,
      exerciseId: input.exerciseId,
      exerciseOrder: input.exerciseOrder,
      targetSets: input.targetSets,
      minReps: input.minReps ?? null,
      maxReps: input.maxReps ?? null,
      restSeconds: input.restSeconds ?? null,
      notes: input.notes ?? null,
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
    if (input.minReps !== undefined) entity.minReps = input.minReps
    if (input.maxReps !== undefined) entity.maxReps = input.maxReps
    if (input.restSeconds !== undefined) entity.restSeconds = input.restSeconds
    if (input.notes !== undefined) entity.notes = input.notes
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapExercise(await this.trainingExercises.save(entity))
  }

  async deleteExercise(id: string, userId: string): Promise<boolean> {
    const entity = await this.findOwnedExercise(id, userId)
    if (!entity) return false
    const result = await this.trainingExercises.delete(id)
    return (result.affected ?? 0) > 0
  }

  async createSet(input: CreateTrainingSetRepositoryInput): Promise<TrainingSet | null> {
    const exercise = await this.findOwnedExercise(input.trainingExerciseId, input.userId)
    if (!exercise) return null

    const entity = this.trainingSets.create({
      trainingExerciseId: input.trainingExerciseId,
      setNumber: input.setNumber,
      weight: input.weight === undefined || input.weight === null ? null : String(input.weight),
      reps: input.reps ?? null,
      rir: input.rir ?? null,
      rpe: input.rpe === undefined || input.rpe === null ? null : String(input.rpe),
      completed: input.completed ?? true,
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
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapSet(await this.trainingSets.save(entity))
  }

  async deleteSet(id: string, userId: string): Promise<boolean> {
    const entity = await this.findOwnedSet(id, userId)
    if (!entity) return false
    const result = await this.trainingSets.delete(id)
    return (result.affected ?? 0) > 0
  }
}
