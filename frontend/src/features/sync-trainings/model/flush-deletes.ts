import { templateApi } from '@/entities/template/api/template-api'
import { trainingApi } from '@/entities/training/api/training-api'
import { ApiError } from '@/shared/api/client'

import { deleteOutbox } from './delete-outbox'

const SYNC_WRITE_TIMEOUT_MS = 12000

export async function flushDeletes() {
  for (const entry of deleteOutbox.list()) {
    try {
      const extras = { timeoutMs: SYNC_WRITE_TIMEOUT_MS }
      if (entry.entity === 'training') {
        await trainingApi.remove(entry.id, extras)
      } else if (entry.entity === 'template') {
        await templateApi.remove(entry.id, extras)
      } else if (entry.entity === 'training-exercise') {
        await trainingApi.removeExercise(entry.id, extras)
      } else if (entry.entity === 'training-set') {
        await trainingApi.removeSet(entry.id, extras)
      } else if (entry.entity === 'training-group') {
        await trainingApi.deleteGroup(entry.id, extras)
      } else if (entry.entity === 'template-exercise') {
        await templateApi.removeExercise(entry.id, extras)
      } else if (entry.entity === 'template-group') {
        await templateApi.deleteGroup(entry.id, extras)
      }
      deleteOutbox.dequeue(entry.entity, entry.id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        deleteOutbox.dequeue(entry.entity, entry.id)
        continue
      }
    }
  }
}
