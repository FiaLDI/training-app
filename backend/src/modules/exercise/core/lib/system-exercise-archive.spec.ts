import {
  buildSeedArchive,
  classifySeedImport,
  dedupeSeedItems,
  normalizeExerciseName,
  parseSeedArchive,
  parseSeedImagePath,
  parseUploadFilename,
  seedImagePath,
  stripSeedMetadata,
} from './system-exercise-archive'

describe('normalizeExerciseName', () => {
  it('trims and collapses whitespace case-insensitively', () => {
    expect(normalizeExerciseName('  Жим   лёжа ')).toBe('жим лёжа')
  })
})

describe('stripSeedMetadata', () => {
  it('drops environment-specific primary image keys', () => {
    expect(
      stripSeedMetadata({
        primaryImageUrl: '/upload/a.gif',
        primaryImageSourceId: 'src-1',
        primaryImageThumbUrl: '/upload/a-thumb.webp',
        primaryImageMediumUrl: '/upload/a-md.webp',
        catalogSyncedAt: '2026-01-01T00:00:00.000Z',
        keep: true,
      }),
    ).toEqual({ keep: true })
  })
})

describe('parseUploadFilename', () => {
  it('accepts public upload paths and rejects traversal', () => {
    expect(parseUploadFilename('/upload/abc.gif')).toBe('abc.gif')
    expect(parseUploadFilename('/upload/../secret')).toBeNull()
    expect(parseUploadFilename('https://cdn.example/a.gif')).toBeNull()
  })
})

describe('seed image paths', () => {
  it('builds and parses a single primary-image path per exercise', () => {
    const path = seedImagePath('3e8af948-5fdf-4fe7-bde0-0fefeb386b89', 'photo.GIF')
    expect(path).toBe('images/3e8af948-5fdf-4fe7-bde0-0fefeb386b89.gif')
    expect(parseSeedImagePath(path)).toEqual({
      exerciseId: '3e8af948-5fdf-4fe7-bde0-0fefeb386b89',
      ext: '.gif',
    })
    expect(parseSeedImagePath('images/not-a-uuid.gif')).toBeNull()
  })
})

describe('parseSeedArchive', () => {
  it('accepts the legacy exercises.json shape', () => {
    const archive = parseSeedArchive({
      items: [
        {
          id: '3e8af948-5fdf-4fe7-bde0-0fefeb386b89',
          name: 'Тяга в хаммере',
          description: null,
          muscleGroup: 'широчайшие',
          difficulty: null,
          metadata: { primaryImageUrl: '/upload/x.gif' },
        },
      ],
      total: 1,
    })
    expect(archive.items).toHaveLength(1)
    expect(archive.items[0]?.name).toBe('Тяга в хаммере')
    expect(archive.items[0]?.metadata).toEqual({})
    expect(archive.items[0]?.primaryImage).toBeUndefined()
  })

  it('keeps a valid primaryImage relative path', () => {
    const archive = parseSeedArchive({
      version: 1,
      items: [
        {
          id: '3e8af948-5fdf-4fe7-bde0-0fefeb386b89',
          name: 'Жим',
          primaryImage: 'images/3e8af948-5fdf-4fe7-bde0-0fefeb386b89.webp',
        },
      ],
    })
    expect(archive.items[0]?.primaryImage).toBe(
      'images/3e8af948-5fdf-4fe7-bde0-0fefeb386b89.webp',
    )
  })
})

describe('dedupeSeedItems', () => {
  it('keeps the first item when names collide', () => {
    const result = dedupeSeedItems([
      { id: '3e8af948-5fdf-4fe7-bde0-0fefeb386b89', name: 'Жим лёжа' },
      { id: '7acbe487-b758-4eee-a623-f589c6a0b944', name: '  жим   лёжа' },
    ])
    expect(result.items).toHaveLength(1)
    expect(result.skipped).toEqual([
      {
        id: '7acbe487-b758-4eee-a623-f589c6a0b944',
        name: '  жим   лёжа',
        reason: 'name',
      },
    ])
  })
})

describe('classifySeedImport', () => {
  const item = {
    id: '3e8af948-5fdf-4fe7-bde0-0fefeb386b89',
    name: 'Жим лёжа',
    description: null,
    muscleGroup: null,
    difficulty: null,
    metadata: {},
  }

  it('skips an existing id', () => {
    const result = classifySeedImport([item], [
      { id: item.id, name: 'Other', isSystem: false },
    ])
    expect(result.toCreate).toHaveLength(0)
    expect(result.skipped[0]?.reason).toBe('id')
  })

  it('skips a colliding system name with a different id', () => {
    const result = classifySeedImport([item], [
      {
        id: '7acbe487-b758-4eee-a623-f589c6a0b944',
        name: 'жим лёжа',
        isSystem: true,
      },
    ])
    expect(result.toCreate).toHaveLength(0)
    expect(result.skipped[0]?.reason).toBe('name')
  })

  it('does not skip a custom with the same name', () => {
    const result = classifySeedImport([item], [
      {
        id: '7acbe487-b758-4eee-a623-f589c6a0b944',
        name: 'Жим лёжа',
        isSystem: false,
      },
    ])
    expect(result.toCreate).toEqual([item])
  })
})

describe('buildSeedArchive', () => {
  it('sets version 1', () => {
    const archive = buildSeedArchive([])
    expect(archive.version).toBe(1)
    expect(archive.items).toEqual([])
  })
})
