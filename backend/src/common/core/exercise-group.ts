export type ExerciseGroupType = 'superset' | 'triset' | 'circuit'

export function groupTypeFromMemberCount(count: number): ExerciseGroupType {
  if (count === 2) return 'superset'
  if (count === 3) return 'triset'
  return 'circuit'
}

export function areExerciseOrdersContiguous(orders: number[]): boolean {
  if (orders.length < 2) return false
  const sorted = [...orders].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] - sorted[i - 1] !== 1) return false
  }
  return true
}
