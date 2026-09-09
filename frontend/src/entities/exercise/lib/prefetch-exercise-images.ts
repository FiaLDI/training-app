import { getPrimaryImageUrls } from '@/entities/exercise/lib/primary-image'
import type { Exercise } from '@/entities/exercise/model/types'
import { isConstrainedConnection } from '@/shared/lib/network-constraints'

const MAX_PREFETCH = 256

export function collectPrefetchImageUrls(exercises: Exercise[]): string[] {
  const seen = new Set<string>()
  const urls: string[] = []
  for (const exercise of exercises) {
    const image = getPrimaryImageUrls(exercise)
    const thumb = image?.thumbUrl
    if (!thumb || seen.has(thumb)) continue
    seen.add(thumb)
    urls.push(thumb)
    if (urls.length >= MAX_PREFETCH) break
  }
  return urls
}

export function prefetchExerciseImages(exercises: Exercise[]): void {
  if (typeof window === 'undefined') return
  if (isConstrainedConnection()) return
  for (const url of collectPrefetchImageUrls(exercises)) {
    void fetch(url, { credentials: 'same-origin' }).catch(() => {
      // opportunistic — SW / browser cache still fill on first view
    })
  }
}
