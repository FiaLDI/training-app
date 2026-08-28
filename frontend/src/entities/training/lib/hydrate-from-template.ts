import { templateApi } from '@/entities/template/api/template-api'
import type { WorkoutTemplateWithExercises } from '@/entities/template/model/types'
import type { TrainingWithDetails } from '@/entities/training/model/types'
import { useSessionStore } from '@/entities/session/model/store'
import { localData } from '@/shared/lib/local-data'
import { mirrorTemplateLocally } from '@/shared/lib/template-sync-meta'

const TEMPLATE_READ_TIMEOUT_MS = 8000

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

/** Load template with exercises into local cache (fetch from API if list-only shell). */
export async function ensureTemplateWithExercises(
  templateId: string,
): Promise<WorkoutTemplateWithExercises | null> {
  const local = localData.templates.get(templateId)
  if (local && local.exercises.length > 0) return local
  if (isLocalMode()) return local

  try {
    const remote = await templateApi.getById(templateId, {
      timeoutMs: TEMPLATE_READ_TIMEOUT_MS,
    })
    return mirrorTemplateLocally(remote, 'synced')
  } catch {
    return local
  }
}

export function trainingNeedsTemplateHydration(training: TrainingWithDetails): boolean {
  return Boolean(training.templateId) && training.exercises.length === 0
}

/** Copy plan exercises into a training that was created without them. */
export async function hydrateTrainingFromTemplate(
  trainingId: string,
): Promise<TrainingWithDetails | null> {
  const training = localData.trainings.get(trainingId)
  if (!training?.templateId || !trainingNeedsTemplateHydration(training)) {
    return training
  }

  const template = await ensureTemplateWithExercises(training.templateId)
  if (!template || template.exercises.length === 0) return training

  return localData.trainings.hydrateFromTemplate(trainingId, template)
}
