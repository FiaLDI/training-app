import { BadRequestException } from '@nestjs/common'

import { ApplyProgramUseCase } from './apply-program.use-case'

describe('ApplyProgramUseCase', () => {
  const userId = 'user-1'
  const program = {
    id: 'prog-1',
    userId,
    isSystem: false,
    name: 'Неделя',
    description: null,
    metadata: {},
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    days: [
      {
        id: 'day-mon',
        programId: 'prog-1',
        dayOfWeek: 1,
        slotOrder: 0,
        templateId: 'tpl-1',
        notes: null,
      },
      {
        id: 'day-wed',
        programId: 'prog-1',
        dayOfWeek: 3,
        slotOrder: 0,
        templateId: 'tpl-2',
        notes: null,
      },
    ],
  }

  const template = {
    id: 'tpl-1',
    userId,
    isSystem: false,
    name: 'A',
    description: null,
    metadata: {},
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    exercises: [],
    groups: [],
  }

  function setup() {
    const created: Array<{ scheduledAt: string; templateId: string | null }> = []
    const updated: Array<{ id: string; status?: string }> = []
    const programRepository = {
      getById: jest.fn().mockResolvedValue(program),
    }
    const trainingRepository = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 200 }),
      create: jest.fn(async (input: { scheduledAt: string; templateId: string | null }) => {
        created.push(input)
        return { id: `t-${created.length}`, ...input }
      }),
      update: jest.fn(async (input: { id: string; status?: string }) => {
        updated.push(input)
        return { id: input.id }
      }),
      findActiveByProgramDay: jest.fn().mockResolvedValue(null),
      findActiveOnScheduledDate: jest.fn().mockResolvedValue(null),
    }
    const templateRepository = {
      getById: jest.fn().mockResolvedValue(template),
    }
    const useCase = new ApplyProgramUseCase(
      programRepository as never,
      trainingRepository as never,
      templateRepository as never,
    )
    return { useCase, trainingRepository, created, updated }
  }

  it('rejects past weeks', async () => {
    const { useCase } = setup()
    await expect(
      useCase.execute({ id: program.id, userId, weekStart: '2026-08-31' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('creates planned trainings for the current week', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-16T10:00:00.000Z'))
    const { useCase, created } = setup()
    const result = await useCase.execute({
      id: program.id,
      userId,
      weekStart: '2026-09-14',
    })
    expect(result.created).toHaveLength(2)
    expect(created.map((item) => item.scheduledAt)).toEqual([
      '2026-09-14T12:00:00.000Z',
      '2026-09-16T12:00:00.000Z',
    ])
    jest.useRealTimers()
  })

  it('cancels planned trainings and keeps finished days when replacing', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-16T10:00:00.000Z'))
    const { useCase, trainingRepository, created, updated } = setup()
    trainingRepository.list.mockResolvedValue({
      items: [
        {
          id: 'planned-old',
          status: 'planned',
          scheduledAt: '2026-09-16T12:00:00.000Z',
          createdAt: '2026-09-14T12:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 200,
    })
    trainingRepository.findActiveOnScheduledDate.mockImplementation(
      async (_userId: string, scheduledAt: string) => {
        if (scheduledAt.startsWith('2026-09-14')) {
          return { id: 'finished-mon', status: 'finished' }
        }
        return null
      },
    )

    const result = await useCase.execute({
      id: program.id,
      userId,
      weekStart: '2026-09-14',
      replacePlanned: true,
    })

    expect(updated).toEqual([expect.objectContaining({ id: 'planned-old', status: 'cancelled' })])
    expect(created).toHaveLength(1)
    expect(created[0].scheduledAt).toBe('2026-09-16T12:00:00.000Z')
    expect(result.skipped).toBe(1)
    jest.useRealTimers()
  })
})
