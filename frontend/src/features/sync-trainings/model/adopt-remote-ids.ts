import type { TrainingWithDetails } from '@/entities/training/model/types'
import { localData } from '@/shared/lib/local-data'

function catalogKey(exercise: { exerciseId: string; exerciseOrder: number }) {
  return `${exercise.exerciseId}:${exercise.exerciseOrder}`
}

function sameIdSet(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false
  for (const id of left) {
    if (!right.has(id)) return false
  }
  return true
}

/**
 * Point local exercise/group rows at ids the server already has for the same
 * catalog exercise + order, so upload upserts instead of creating a second copy.
 */
export function adoptRemoteEntityIds(trainingId: string, remote: TrainingWithDetails) {
  const local = localData.trainings.get(trainingId)
  if (!local) return

  const remoteByKey = new Map<string, (typeof remote.exercises)[number]>()
  for (const exercise of remote.exercises) {
    const key = catalogKey(exercise)
    if (!remoteByKey.has(key)) remoteByKey.set(key, exercise)
  }

  for (const localExercise of local.exercises) {
    const remoteExercise = remoteByKey.get(catalogKey(localExercise))
    if (!remoteExercise || remoteExercise.id === localExercise.id) continue
    localData.trainings.rebindExerciseId(localExercise.id, remoteExercise.id)
  }

  const after = localData.trainings.get(trainingId)
  if (!after) return

  const remoteGroups = remote.groups ?? []
  for (const localGroup of after.groups ?? []) {
    const localMemberIds = new Set(
      after.exercises.filter((item) => item.groupId === localGroup.id).map((item) => item.id),
    )
    const match = remoteGroups.find((group) => {
      const remoteMemberIds = new Set(
        remote.exercises.filter((item) => item.groupId === group.id).map((item) => item.id),
      )
      return localMemberIds.size >= 2 && sameIdSet(localMemberIds, remoteMemberIds)
    })
    if (match && match.id !== localGroup.id) {
      localData.trainings.rebindGroupId(localGroup.id, match.id)
    }
  }
}
