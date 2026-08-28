import { BadRequestException } from '@nestjs/common'

import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { CreateTrainingExerciseGroupUseCase } from './create-training-exercise-group.use-case'

describe('CreateTrainingExerciseGroupUseCase', () => {
  const userId = 'user-1'
  const trainingId = 'training-1'

  let repository: jest.Mocked<Pick<TrainingRepositoryPort, 'getById' | 'createGroup'>>
  let useCase: CreateTrainingExerciseGroupUseCase

  beforeEach(() => {
    repository = {
      getById: jest.fn(),
      createGroup: jest.fn(),
    }
    useCase = new CreateTrainingExerciseGroupUseCase(repository as unknown as TrainingRepositoryPort)
  })

  it('rejects when training is missing', async () => {
    repository.getById.mockResolvedValue(null)

    await expect(
      useCase.execute({
        trainingId,
        userId,
        exerciseIds: ['ex-1', 'ex-2'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects when fewer than two exercises are provided', async () => {
    repository.getById.mockResolvedValue({
      id: trainingId,
      exercises: [{ id: 'ex-1', exerciseOrder: 0 }],
    } as Awaited<ReturnType<TrainingRepositoryPort['getById']>>)

    await expect(
      useCase.execute({
        trainingId,
        userId,
        exerciseIds: ['ex-1'],
      }),
    ).rejects.toThrow('At least two exercises are required')
  })

  it('creates a group with the minimum exercise order', async () => {
    const group = { id: 'group-1', type: 'superset' as const, groupOrder: 1 }
    repository.getById.mockResolvedValue({
      id: trainingId,
      exercises: [
        { id: 'ex-1', exerciseOrder: 2 },
        { id: 'ex-2', exerciseOrder: 3 },
      ],
    } as Awaited<ReturnType<TrainingRepositoryPort['getById']>>)
    repository.createGroup.mockResolvedValue(group as Awaited<
      ReturnType<TrainingRepositoryPort['createGroup']>
    >)

    const result = await useCase.execute({
      trainingId,
      userId,
      exerciseIds: ['ex-1', 'ex-2'],
      type: 'superset',
      restSeconds: 90,
    })

    expect(repository.createGroup).toHaveBeenCalledWith({
      id: undefined,
      trainingId,
      userId,
      exerciseIds: ['ex-1', 'ex-2'],
      type: 'superset',
      groupOrder: 2,
      restSeconds: 90,
    })
    expect(result.group).toEqual(group)
  })

  it('surfaces repository validation failures', async () => {
    repository.getById.mockResolvedValue({
      id: trainingId,
      exercises: [
        { id: 'ex-1', exerciseOrder: 0 },
        { id: 'ex-2', exerciseOrder: 5 },
      ],
    } as Awaited<ReturnType<TrainingRepositoryPort['getById']>>)
    repository.createGroup.mockResolvedValue(null)

    await expect(
      useCase.execute({
        trainingId,
        userId,
        exerciseIds: ['ex-1', 'ex-2'],
      }),
    ).rejects.toThrow('Cannot create group')
  })
})
