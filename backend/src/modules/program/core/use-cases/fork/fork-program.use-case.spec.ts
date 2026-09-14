import { ForkProgramUseCase } from './fork-program.use-case'

describe('ForkProgramUseCase', () => {
  const userId = 'user-1'
  const system = {
    id: 'sys-1',
    userId: null,
    isSystem: true,
    name: 'PPL',
    description: 'split',
    metadata: { catalogSlug: 'ppl' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    days: [
      {
        id: 'd1',
        programId: 'sys-1',
        dayOfWeek: 1,
        slotOrder: 0,
        templateId: 'tpl-1',
        notes: null,
      },
    ],
  }

  it('copies a system program for the user and reuses an existing fork', async () => {
    const createdDays: Array<{ programId: string; templateId: string | null }> = []
    const repo = {
      getById: jest
        .fn()
        .mockResolvedValueOnce(system)
        .mockResolvedValueOnce({ ...system, id: 'copy-1', userId, isSystem: false, days: system.days }),
      findUserFork: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'copy-1',
        userId,
        isSystem: false,
        name: 'PPL',
        description: 'split',
        metadata: { forkedFrom: 'sys-1' },
        createdAt: '2026-09-14T00:00:00.000Z',
        updatedAt: '2026-09-14T00:00:00.000Z',
      }),
      createDay: jest.fn(async (input: { programId: string; templateId: string | null }) => {
        createdDays.push(input)
        return { id: 'nd1', ...input }
      }),
    }

    const first = await new ForkProgramUseCase(repo as never).execute({ id: 'sys-1', userId })
    expect(first.program.id).toBe('copy-1')
    expect(createdDays).toEqual([expect.objectContaining({ programId: 'copy-1', templateId: 'tpl-1' })])

    repo.findUserFork.mockResolvedValue(first.program)
    repo.getById.mockResolvedValue(system)
    const second = await new ForkProgramUseCase(repo as never).execute({ id: 'sys-1', userId })
    expect(second.program.id).toBe('copy-1')
    expect(repo.create).toHaveBeenCalledTimes(1)
  })
})
