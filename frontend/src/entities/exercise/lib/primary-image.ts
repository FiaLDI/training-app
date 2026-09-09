import type { Exercise } from '@/entities/exercise/model/types'
import type { ExerciseSource } from '@/entities/source/model/types'

export const PRIMARY_IMAGE_SOURCE_ID_KEY = 'primaryImageSourceId'
export const PRIMARY_IMAGE_URL_KEY = 'primaryImageUrl'
export const PRIMARY_IMAGE_THUMB_URL_KEY = 'primaryImageThumbUrl'
export const PRIMARY_IMAGE_MEDIUM_URL_KEY = 'primaryImageMediumUrl'

export const SOURCE_THUMB_URL_KEY = 'thumbUrl'
export const SOURCE_MEDIUM_URL_KEY = 'mediumUrl'

export type ExerciseImageUrls = {
  src: string
  thumbUrl: string | null
  mediumUrl: string | null
}

function readUrl(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function getPrimaryImageUrl(exercise: Exercise): string | null {
  return readUrl(exercise.metadata?.[PRIMARY_IMAGE_URL_KEY])
}

export function getPrimaryImageSourceId(exercise: Exercise): string | null {
  return readUrl(exercise.metadata?.[PRIMARY_IMAGE_SOURCE_ID_KEY])
}

export function getPrimaryImageUrls(exercise: Exercise): ExerciseImageUrls | null {
  const src = getPrimaryImageUrl(exercise)
  if (!src) return null
  return {
    src,
    thumbUrl: readUrl(exercise.metadata?.[PRIMARY_IMAGE_THUMB_URL_KEY]),
    mediumUrl: readUrl(exercise.metadata?.[PRIMARY_IMAGE_MEDIUM_URL_KEY]),
  }
}

export function getSourceImageUrls(
  source: Pick<ExerciseSource, 'url' | 'metadata'>,
): ExerciseImageUrls {
  return {
    src: source.url,
    thumbUrl: readUrl(source.metadata?.[SOURCE_THUMB_URL_KEY]),
    mediumUrl: readUrl(source.metadata?.[SOURCE_MEDIUM_URL_KEY]),
  }
}

export function withPrimaryImage(
  metadata: Record<string, unknown>,
  source: Pick<ExerciseSource, 'id' | 'url' | 'metadata'>,
): Record<string, unknown> {
  const thumbUrl = readUrl(source.metadata?.[SOURCE_THUMB_URL_KEY])
  const mediumUrl = readUrl(source.metadata?.[SOURCE_MEDIUM_URL_KEY])
  const next: Record<string, unknown> = {
    ...metadata,
    [PRIMARY_IMAGE_SOURCE_ID_KEY]: source.id,
    [PRIMARY_IMAGE_URL_KEY]: source.url,
  }
  if (thumbUrl) next[PRIMARY_IMAGE_THUMB_URL_KEY] = thumbUrl
  else delete next[PRIMARY_IMAGE_THUMB_URL_KEY]
  if (mediumUrl) next[PRIMARY_IMAGE_MEDIUM_URL_KEY] = mediumUrl
  else delete next[PRIMARY_IMAGE_MEDIUM_URL_KEY]
  return next
}

export function clearPrimaryImage(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...metadata }
  delete next[PRIMARY_IMAGE_SOURCE_ID_KEY]
  delete next[PRIMARY_IMAGE_URL_KEY]
  delete next[PRIMARY_IMAGE_THUMB_URL_KEY]
  delete next[PRIMARY_IMAGE_MEDIUM_URL_KEY]
  return next
}

export function isImageSource(source: Pick<ExerciseSource, 'type'>): boolean {
  return source.type === 'image'
}
