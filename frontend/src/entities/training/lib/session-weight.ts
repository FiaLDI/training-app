export function workingSetMaxWeight(
  sets: Array<{ completed: boolean; isWarmup?: boolean; weight: number | null }>,
  isWarmupExercise = false,
): number | null {
  if (isWarmupExercise) return null
  const weights = sets
    .filter((set) => set.completed && !set.isWarmup && set.weight != null)
    .map((set) => set.weight as number)
  return weights.length > 0 ? Math.max(...weights) : null
}

export function lastWorkingSetWeight(
  sets: Array<{ isWarmup?: boolean; weight: number | null; setNumber: number }>,
): number | null {
  const working = [...sets]
    .filter((set) => !set.isWarmup && set.weight != null)
    .sort((a, b) => a.setNumber - b.setNumber)
  const last = working[working.length - 1]
  return last?.weight ?? null
}

export function trainingOccurredAt(training: {
  finishedAt: string | null
  startedAt: string | null
  scheduledAt: string | null
  createdAt: string
}): string {
  return training.finishedAt ?? training.startedAt ?? training.scheduledAt ?? training.createdAt
}

export function formatKg(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
