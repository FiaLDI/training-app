import type { ExerciseSource } from '@/entities/source/model/types'

export function isVideoSource(source: ExerciseSource): boolean {
  if (source.type === 'youtube' || source.type === 'video') return true
  return /\.(mp4|webm|mov)(\?|$)/i.test(source.url)
}
