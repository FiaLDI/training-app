import type { ProgramSnapshot } from '@/entities/share/model/types'

export type CatalogProgramListItem = {
  id: string
  slug: string
  name: string
  author: string
  description: string
  tags: string[]
  verified: boolean
  daysPerWeek: number
}

export type CatalogProgramDetail = CatalogProgramListItem & {
  snapshot: ProgramSnapshot
}

export type InstallCatalogResult = {
  programId?: string
  skippedExercises: string[]
}
