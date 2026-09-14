import { apiRequest } from '@/shared/api/client'

import type { ImportShareResult, PublicShare, ShareLink } from '../model/types'

export const shareApi = {
  getMine(resourceType: 'template' | 'program', resourceId: string) {
    const search = new URLSearchParams({ resourceType, resourceId })
    return apiRequest<ShareLink | null>(`/share/resource?${search}`)
  },

  createTemplate(id: string) {
    return apiRequest<ShareLink>(`/share/templates/${id}`, { method: 'POST' })
  },

  createProgram(id: string) {
    return apiRequest<ShareLink>(`/share/programs/${id}`, { method: 'POST' })
  },

  getPublic(token: string) {
    return apiRequest<PublicShare>(`/share/${encodeURIComponent(token)}`, { skipAuth: true })
  },

  revoke(token: string) {
    return apiRequest<{ revoked: boolean }>(`/share/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    })
  },

  importShare(token: string) {
    return apiRequest<ImportShareResult>(`/share/${encodeURIComponent(token)}/import`, {
      method: 'POST',
    })
  },
}
