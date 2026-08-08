import { BadRequestException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../../../template/core/ports/template-repository.port'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { CreateTrainingInput } from './interfaces/create-training.input'
import { CreateTrainingOutput } from './interfaces/create-training.output'

export class CreateTrainingUseCase implements UseCase<CreateTrainingInput, CreateTrainingOutput> {
  constructor(
    private readonly trainingRepository: TrainingRepositoryPort,
    private readonly templateRepository: TemplateRepositoryPort,
  ) {}

  public async execute(input: CreateTrainingInput): Promise<CreateTrainingOutput> {
    if (input.id) {
      const existing = await this.trainingRepository.getById(input.id, input.userId)
      if (existing) return { training: existing }
    }

    if (input.status === 'planned') {
      if (!input.scheduledAt) {
        throw new BadRequestException('scheduledAt is required for planned trainings')
      }
    } else if (input.status === 'in_progress' || input.status === 'finished') {
      if (!input.startedAt) {
        throw new BadRequestException('startedAt is required for started trainings')
      }
    }

    const training = await this.trainingRepository.create({
      ...input,
      startedAt: input.status === 'planned' ? null : input.startedAt ?? null,
      scheduledAt: input.scheduledAt ?? null,
    })

    if (input.templateId) {
      const template = await this.templateRepository.getById(input.templateId, input.userId)
      if (template) {
        for (const item of template.exercises) {
          await this.trainingRepository.createExercise({
            trainingId: training.id,
            userId: input.userId,
            exerciseId: item.exerciseId,
            exerciseOrder: item.exerciseOrder,
            targetSets: item.targetSets,
            isWarmup: item.isWarmup,
            minReps: item.minReps,
            maxReps: item.maxReps,
            restSeconds: item.restSeconds,
            notes: item.notes,
            metadata:
              item.targetWeight != null ? { targetWeight: item.targetWeight } : item.metadata,
          })
        }
      }
    }

    const detailed = await this.trainingRepository.getById(training.id, input.userId)
    if (!detailed) {
      throw new BadRequestException('Failed to load created training')
    }
    return { training: detailed }
  }
}
