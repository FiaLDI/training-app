import { apiRequest } from '@/shared/api/client'

import type { CloudSyncState } from '@/shared/lib/cloud-sync-state'

type RequestExtras = {
  timeoutMs?: number
}

export const syncApi = {
  state(extras: RequestExtras = {}) {
    return apiRequest<CloudSyncState>('/sync/state', extras)
  },
}
