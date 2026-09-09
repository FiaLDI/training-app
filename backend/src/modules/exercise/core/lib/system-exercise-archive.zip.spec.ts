import { packSeedZip, unpackSeedZip } from './system-exercise-archive.zip'
import { buildSeedArchive } from './system-exercise-archive'

describe('seed zip round-trip', () => {
  it('packs exercises.json and a single primary image', async () => {
    const id = '3e8af948-5fdf-4fe7-bde0-0fefeb386b89'
    const archive = buildSeedArchive([
      {
        id,
        name: 'Жим',
        description: null,
        muscleGroup: null,
        difficulty: null,
        metadata: {},
        primaryImage: `images/${id}.gif`,
      },
    ])
    const images = new Map<string, Buffer>([[`images/${id}.gif`, Buffer.from('GIF89a')]])
    const packed = await packSeedZip(archive, images)
    const unpacked = await unpackSeedZip(packed)
    expect(unpacked.archive.items[0]?.name).toBe('Жим')
    expect(unpacked.archive.items[0]?.primaryImage).toBe(`images/${id}.gif`)
    expect(unpacked.images.get(`images/${id}.gif`)?.toString()).toBe('GIF89a')
  })
})
