import { templateApi } from '@/entities/template/api/template-api'
import type {
  TemplateExercise,
  TemplateExerciseGroup,
  WorkoutTemplateWithExercises,
} from '@/entities/template/model/types'
import { ApiError } from '@/shared/api/client'
import { localData } from '@/shared/lib/local-data'
import {
  listPendingTemplates,
  markTemplateSyncError,
  markTemplateSynced,
} from '@/shared/lib/template-sync-meta'

export type SyncTemplateProgress = {
  templateId: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

function stripSyncMeta(metadata: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== 'sync'))
}

async function ensureTemplateShell(template: WorkoutTemplateWithExercises) {
  let exists = false
  try {
    await templateApi.getById(template.id)
    exists = true
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }

  const payload = {
    name: template.name,
    description: template.description,
    metadata: stripSyncMeta(template.metadata),
  }

  if (exists) {
    await templateApi.update(template.id, payload)
    return
  }

  await templateApi.create({
    id: template.id,
    ...payload,
  })
}

async function upsertTemplateExercise(templateId: string, exercise: TemplateExercise) {
  // Group membership is synced via createGroup — not on exercise POST/PATCH.
  const updateBody = {
    exerciseOrder: exercise.exerciseOrder,
    targetSets: exercise.targetSets,
    isWarmup: exercise.isWarmup,
    minReps: exercise.minReps,
    maxReps: exercise.maxReps,
    targetWeight: exercise.targetWeight,
    restSeconds: exercise.restSeconds,
    notes: exercise.notes,
    metadata: exercise.metadata,
  }

  await templateApi.addExercise(templateId, {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    ...updateBody,
  })
  try {
    await templateApi.updateExercise(exercise.id, updateBody)
  } catch (error) {
    if (!(error instanceof ApiError && (error.status === 400 || error.status === 404))) {
      throw error
    }
  }
}

async function upsertTemplateGroup(
  template: WorkoutTemplateWithExercises,
  group: TemplateExerciseGroup,
) {
  const members = template.exercises
    .filter((item) => item.groupId === group.id)
    .sort((a, b) => (a.positionInGroup ?? 0) - (b.positionInGroup ?? 0))
  if (members.length < 2) return

  const exerciseIds = members.map((member) => member.id)
  try {
    await templateApi.createGroup(template.id, {
      id: group.id,
      exerciseIds,
      type: group.type,
      restSeconds: group.restSeconds,
    })
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 400)) throw error
    await templateApi.createGroup(template.id, {
      id: group.id,
      exerciseIds: [exerciseIds[0], exerciseIds[1]],
      type: group.type,
      restSeconds: group.restSeconds,
    })
    for (let i = 2; i < exerciseIds.length; i += 1) {
      await templateApi.addExerciseToGroup(group.id, { exerciseId: exerciseIds[i] })
    }
  }
  await templateApi.updateGroup(group.id, { restSeconds: group.restSeconds })
}

export async function syncTemplates(
  templateIds: string[],
  onProgress?: (items: SyncTemplateProgress[]) => void,
): Promise<SyncTemplateProgress[]> {
  const progress: SyncTemplateProgress[] = templateIds.map((templateId) => ({
    templateId,
    status: 'pending',
  }))
  const emit = () => onProgress?.(progress.map((item) => ({ ...item })))

  for (const item of progress) {
    item.status = 'uploading'
    emit()

    const detailed = localData.templates.get(item.templateId)
    if (!detailed) {
      item.status = 'error'
      item.error = 'План не найден локально'
      emit()
      continue
    }

    try {
      await uploadTemplate(detailed)
      markTemplateSynced(detailed.id)
      item.status = 'done'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось отправить'
      markTemplateSyncError(detailed.id, message)
      item.status = 'error'
      item.error = message
    }
    emit()
  }

  return progress
}

async function uploadTemplate(template: WorkoutTemplateWithExercises) {
  await ensureTemplateShell(template)

  for (const exercise of template.exercises) {
    await upsertTemplateExercise(template.id, exercise)
  }

  for (const group of template.groups ?? []) {
    await upsertTemplateGroup(template, group)
  }

  // Removals go through deleteOutbox only — never diff-delete remote from a snapshot.
}

export { listPendingTemplates }
