import { collectPrefetchImageUrls } from './prefetch-exercise-images'
import type { Exercise } from '@/entities/exercise/model/types'

function exercise(metadata: Record<string, unknown>): Exercise {
  return {
    id: 'ex',
    isSystem: false,
    name: 'Жим',
    description: null,
    muscleGroup: null,
    difficulty: null,
    metadata,
    createdAt: '',
    updatedAt: '',
  }
}

describe('collectPrefetchImageUrls', () => {
  it('prefers thumbs and skips originals without variants', () => {
    expect(
      collectPrefetchImageUrls([
        exercise({
          primaryImageUrl: '/upload/a.jpg',
          primaryImageThumbUrl: '/upload/a-thumb.webp',
        }),
        exercise({ primaryImageUrl: '/upload/b.jpg' }),
        exercise({
          primaryImageUrl: '/upload/a.jpg',
          primaryImageThumbUrl: '/upload/a-thumb.webp',
        }),
      ]),
    ).toEqual(['/upload/a-thumb.webp'])
  })
})
