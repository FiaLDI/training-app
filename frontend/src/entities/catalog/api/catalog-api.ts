import { apiRequest } from '@/shared/api/client'

import type {
  CatalogProgramDetail,
  CatalogProgramListItem,
  InstallCatalogResult,
} from '../model/types'

export const catalogApi = {
  list() {
    return apiRequest<{ items: CatalogProgramListItem[] }>('/catalog', { skipAuth: true })
  },

  getBySlug(slug: string) {
    return apiRequest<CatalogProgramDetail>(`/catalog/${encodeURIComponent(slug)}`, {
      skipAuth: true,
    })
  },

  install(slug: string) {
    return apiRequest<InstallCatalogResult>(`/catalog/${encodeURIComponent(slug)}/install`, {
      method: 'POST',
    })
  },
}
