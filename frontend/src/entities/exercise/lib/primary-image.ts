import type { Exercise } from '@/entities/exercise/model/types'
import type { ExerciseSource } from '@/entities/source/model/types'

export const PRIMARY_IMAGE_SOURCE_ID_KEY = 'primaryImageSourceId'
export const PRIMARY_IMAGE_URL_KEY = 'primaryImageUrl'

export function getPrimaryImageUrl(exercise: Exercise): string | null {
  const url = exercise.metadata?.[PRIMARY_IMAGE_URL_KEY]
  return typeof url === 'string' && url.length > 0 ? url : null
}

export function getPrimaryImageSourceId(exercise: Exercise): string | null {
  const id = exercise.metadata?.[PRIMARY_IMAGE_SOURCE_ID_KEY]
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function withPrimaryImage(
  metadata: Record<string, unknown>,
  source: Pick<ExerciseSource, 'id' | 'url'>,
): Record<string, unknown> {
  return {
    ...metadata,
    [PRIMARY_IMAGE_SOURCE_ID_KEY]: source.id,
    [PRIMARY_IMAGE_URL_KEY]: source.url,
  }
}

export function clearPrimaryImage(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...metadata }
  delete next[PRIMARY_IMAGE_SOURCE_ID_KEY]
  delete next[PRIMARY_IMAGE_URL_KEY]
  return next
}

export function isImageSource(source: Pick<ExerciseSource, 'type'>): boolean {
  return source.type === 'image'
}
