import { Training } from '../../../../../training/core/types'

export interface ApplyProgramOutput {
  created: Training[]
  skipped: number
}
