import { Program } from '../../../types'

export interface ListProgramsOutput {
  items: Program[]
  total: number
  page: number
  limit: number
}
