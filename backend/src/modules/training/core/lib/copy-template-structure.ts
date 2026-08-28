import { TrainingRepositoryPort } from '../ports/training-repository.port'
import { WorkoutTemplateWithExercises } from '../../../template/core/types'

export async function copyTemplateStructureToTraining(
  template: WorkoutTemplateWithExercises,
  trainingId: string,
  userId: string,
  trainingRepository: TrainingRepositoryPort,
): Promise<void> {
  const exerciseIdMap = new Map<string, string>()

  for (const item of [...template.exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)) {
    const created = await trainingRepository.createExercise({
      trainingId,
      userId,
      exerciseId: item.exerciseId,
      exerciseOrder: item.exerciseOrder,
      targetSets: item.targetSets,
      isWarmup: item.isWarmup,
      minReps: item.minReps,
      maxReps: item.maxReps,
      restSeconds: item.restSeconds,
      notes: item.notes,
      metadata:
        item.targetWeight != null ? { targetWeight: item.targetWeight } : item.metadata,
    })
    if (created) {
      exerciseIdMap.set(item.id, created.id)
    }
  }

  for (const group of [...(template.groups ?? [])].sort((a, b) => a.groupOrder - b.groupOrder)) {
    const members = template.exercises
      .filter((item) => item.groupId === group.id)
      .sort((a, b) => (a.positionInGroup ?? 0) - (b.positionInGroup ?? 0))
    if (members.length < 2) continue

    const mappedIds = members
      .map((member) => exerciseIdMap.get(member.id))
      .filter((memberId): memberId is string => Boolean(memberId))
    if (mappedIds.length !== members.length) continue

    await trainingRepository.createGroup({
      trainingId,
      userId,
      type: group.type,
      groupOrder: group.groupOrder,
      restSeconds: group.restSeconds,
      exerciseIds: mappedIds,
      metadata: group.metadata,
    })
  }
}
