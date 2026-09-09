import { ImportSystemExerciseSeedUseCase } from './import-system-exercise-seed.use-case'
import type { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import type { SourceRepositoryPort } from '../../../../source/core/ports/source-repository.port'
import type { UploadFileStore } from '../../../infrastructure/upload-file-store'

describe('ImportSystemExerciseSeedUseCase.apply', () => {
  const id = '3e8af948-5fdf-4fe7-bde0-0fefeb386b89'

  it('creates a system exercise and attaches the primary image', async () => {
    const create = jest.fn().mockResolvedValue({
      id,
      userId: null,
      isSystem: true,
      name: 'Жим',
      description: null,
      muscleGroup: null,
      difficulty: null,
      metadata: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const update = jest.fn().mockResolvedValue({})
    const sourceCreate = jest.fn().mockResolvedValue({
      id: 'src-1',
      url: '/upload/new.gif',
    })
    const writeImage = jest.fn().mockResolvedValue({
      url: '/upload/new.gif',
      filename: 'new.gif',
    })

    const useCase = new ImportSystemExerciseSeedUseCase(
      {
        listCatalogKeys: jest.fn().mockResolvedValue([]),
        create,
        update,
      } as unknown as ExerciseRepositoryPort,
      { create: sourceCreate } as unknown as SourceRepositoryPort,
      { writeImage } as unknown as UploadFileStore,
    )

    const result = await useCase.apply({
      archive: {
        version: 1,
        items: [
          {
            id,
            name: 'Жим',
            description: null,
            muscleGroup: null,
            difficulty: null,
            metadata: {},
            primaryImage: `images/${id}.gif`,
          },
        ],
      },
      images: new Map([[`images/${id}.gif`, Buffer.from('GIF89a')]]),
    })

    expect(result.created).toBe(1)
    expect(result.imagesAttached).toBe(1)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ isSystem: true, userId: null }))
    expect(writeImage).toHaveBeenCalled()
    expect(sourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image', url: '/upload/new.gif' }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          primaryImageUrl: '/upload/new.gif',
          primaryImageSourceId: 'src-1',
        }),
      }),
    )
  })

  it('skips an existing id without writing a file', async () => {
    const create = jest.fn()
    const writeImage = jest.fn()
    const useCase = new ImportSystemExerciseSeedUseCase(
      {
        listCatalogKeys: jest.fn().mockResolvedValue([{ id, name: 'Жим', isSystem: true }]),
        create,
      } as unknown as ExerciseRepositoryPort,
      { create: jest.fn() } as unknown as SourceRepositoryPort,
      { writeImage } as unknown as UploadFileStore,
    )

    const result = await useCase.apply({
      archive: {
        version: 1,
        items: [
          {
            id,
            name: 'Жим',
            description: null,
            muscleGroup: null,
            difficulty: null,
            metadata: {},
            primaryImage: `images/${id}.gif`,
          },
        ],
      },
      images: new Map([[`images/${id}.gif`, Buffer.from('GIF89a')]]),
    })

    expect(result.created).toBe(0)
    expect(result.skipped[0]?.reason).toBe('id')
    expect(create).not.toHaveBeenCalled()
    expect(writeImage).not.toHaveBeenCalled()
  })
})
