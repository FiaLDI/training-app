import type { ExerciseGroupType } from '@/entities/template/model/types'

export function areExerciseOrdersContiguous(orders: number[]): boolean {
  if (orders.length < 2) return false
  const sorted = [...orders].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] - sorted[i - 1] !== 1) return false
  }
  return true
}

export function groupTypeFromMemberCount(count: number): ExerciseGroupType {
  if (count === 2) return 'superset'
  if (count === 3) return 'triset'
  return 'circuit'
}

export function groupTypeLabel(type: ExerciseGroupType): string {
  switch (type) {
    case 'superset':
      return 'Супerset'
    case 'triset':
      return 'Трисет'
    case 'circuit':
      return 'Круг'
    default:
      return 'Группа'
  }
}

export function groupRestLabel(type: ExerciseGroupType): string {
  switch (type) {
    case 'superset':
      return 'Отдых после пары (с)'
    case 'triset':
      return 'Отдых после трисета (с)'
    case 'circuit':
      return 'Отдых после круга (с)'
    default:
      return 'Отдых после группы (с)'
  }
}

type GroupableExercise = {
  id: string
  exerciseOrder: number
  groupId: string | null
  positionInGroup: number | null
}

export type LinkWithBelowAction =
  | { kind: 'create'; exerciseIds: [string, string] }
  | { kind: 'add-to-group'; groupId: string; exerciseId: string }
  | null

export function resolveLinkWithBelowAction(
  item: GroupableExercise,
  below: GroupableExercise | undefined,
  allExercises: GroupableExercise[],
): LinkWithBelowAction {
  if (!below) return null
  if (below.exerciseOrder - item.exerciseOrder !== 1) return null

  if (!item.groupId && !below.groupId) {
    return { kind: 'create', exerciseIds: [item.id, below.id] }
  }

  if (item.groupId && !below.groupId && isLastInGroup(item, allExercises)) {
    return { kind: 'add-to-group', groupId: item.groupId, exerciseId: below.id }
  }

  return null
}

export function isLastInGroup(
  exercise: GroupableExercise,
  candidates: GroupableExercise[],
): boolean {
  if (!exercise.groupId || exercise.positionInGroup == null) return false
  const members = candidates.filter((row) => row.groupId === exercise.groupId)
  const maxPosition = Math.max(...members.map((row) => row.positionInGroup ?? 0))
  return exercise.positionInGroup === maxPosition
}
