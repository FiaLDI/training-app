import { localData } from '@/shared/lib/local-data'

export type ExerciseResolver = {
  resolve: (name: string, muscleGroup?: string | null) => string
  createdCount: number
}

export function createExerciseResolver(): ExerciseResolver {
  const cache = new Map<string, string>()
  let createdCount = 0

  function resolve(name: string, muscleGroup?: string | null): string {
    const trimmed = name.trim()
    if (!trimmed) {
      throw new Error('Пустое название упражнения')
    }

    const cacheKey = trimmed.toLowerCase()
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const existing = localData.exercises
      .list()
      .find((exercise) => exercise.name.toLowerCase() === cacheKey)
    if (existing) {
      cache.set(cacheKey, existing.id)
      return existing.id
    }

    const created = localData.exercises.create({
      name: trimmed,
      muscleGroup: muscleGroup ?? null,
    })
    createdCount += 1
    cache.set(cacheKey, created.id)
    return created.id
  }

  return {
    resolve,
    get createdCount() {
      return createdCount
    },
  }
}
