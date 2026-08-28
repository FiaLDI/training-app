import type { TemplateExercise, TemplateExerciseGroup } from '@/entities/template/model/types'
import type { TrainingExercise, TrainingExerciseGroup } from '@/entities/training/model/types'

export type SessionStandaloneItem<TExercise extends { id: string; exerciseOrder: number }> = {
  kind: 'standalone'
  order: number
  exercise: TExercise
}

export type SessionGroupItem<
  TExercise extends { id: string; groupId: string | null; positionInGroup: number | null },
  TGroup extends { id: string; groupOrder: number },
> = {
  kind: 'group'
  order: number
  group: TGroup
  exercises: TExercise[]
}

export type SessionItem<
  TExercise extends { id: string; exerciseOrder: number; groupId: string | null; positionInGroup: number | null },
  TGroup extends { id: string; groupOrder: number },
> = SessionStandaloneItem<TExercise> | SessionGroupItem<TExercise, TGroup>

export function buildTemplateSessionItems(
  exercises: TemplateExercise[],
  groups: TemplateExerciseGroup[],
): SessionItem<TemplateExercise, TemplateExerciseGroup>[] {
  return buildSessionItems(exercises, groups)
}

export function buildTrainingSessionItems(
  exercises: TrainingExercise[],
  groups: TrainingExerciseGroup[],
): SessionItem<TrainingExercise, TrainingExerciseGroup>[] {
  return buildSessionItems(exercises, groups)
}

function buildSessionItems<
  TExercise extends {
    id: string
    exerciseOrder: number
    groupId: string | null
    positionInGroup: number | null
  },
  TGroup extends { id: string; groupOrder: number },
>(exercises: TExercise[], groups: TGroup[]): SessionItem<TExercise, TGroup>[] {
  const sorted = [...exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)
  const groupById = new Map(groups.map((group) => [group.id, group]))
  const items: SessionItem<TExercise, TGroup>[] = []
  const seenGroups = new Set<string>()

  for (const exercise of sorted) {
    if (exercise.groupId) {
      if (seenGroups.has(exercise.groupId)) continue
      const group = groupById.get(exercise.groupId)
      if (!group) continue
      const members = sorted
        .filter((item) => item.groupId === exercise.groupId)
        .sort((a, b) => (a.positionInGroup ?? 0) - (b.positionInGroup ?? 0))
      seenGroups.add(exercise.groupId)
      items.push({ kind: 'group', order: group.groupOrder, group, exercises: members })
      continue
    }
    items.push({ kind: 'standalone', order: exercise.exerciseOrder, exercise })
  }

  return items.sort((a, b) => a.order - b.order)
}

export function getGroupPartner<
  TExercise extends { id: string; groupId: string | null; positionInGroup: number | null },
>(exercise: TExercise, exercises: TExercise[]): TExercise | null {
  if (!exercise.groupId || exercise.positionInGroup == null) return null
  const position = exercise.positionInGroup
  return (
    exercises.find(
      (item) =>
        item.groupId === exercise.groupId &&
        item.id !== exercise.id &&
        item.positionInGroup != null &&
        item.positionInGroup > position,
    ) ??
    exercises.find(
      (item) =>
        item.groupId === exercise.groupId &&
        item.id !== exercise.id &&
        item.positionInGroup != null &&
        item.positionInGroup < position,
    ) ??
    null
  )
}

export function getNextExerciseInGroup<
  TExercise extends { id: string; groupId: string | null; positionInGroup: number | null },
>(exercise: TExercise, exercises: TExercise[]): TExercise | null {
  if (!exercise.groupId || exercise.positionInGroup == null) return null
  const position = exercise.positionInGroup
  return (
    exercises.find(
      (item) =>
        item.groupId === exercise.groupId &&
        item.positionInGroup != null &&
        item.positionInGroup > position,
    ) ?? null
  )
}

export function isGroupRoundComplete<
  TExercise extends {
    groupId: string | null
    targetSets: number
    sets?: Array<{ isWarmup: boolean; completed: boolean }>
  },
>(groupId: string, exercises: TExercise[]): boolean {
  const members = exercises.filter((item) => item.groupId === groupId)
  if (members.length === 0) return true
  const rounds = Math.min(
    ...members.map((item) => {
      const sets = item.sets ?? []
      return sets.filter((set) => !set.isWarmup && set.completed).length
    }),
  )
  const target = Math.max(...members.map((item) => item.targetSets))
  return rounds >= target
}

export function countCompletedGroupRounds<
  TExercise extends {
    groupId: string | null
    sets?: Array<{ isWarmup: boolean; completed: boolean }>
  },
>(groupId: string, exercises: TExercise[]): number {
  const members = exercises.filter((item) => item.groupId === groupId)
  if (members.length === 0) return 0
  return Math.min(
    ...members.map((item) => {
      const sets = item.sets ?? []
      return sets.filter((set) => !set.isWarmup && set.completed).length
    }),
  )
}
