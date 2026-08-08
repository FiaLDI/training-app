export type Program = {
  id: string
  name: string
  description: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type ProgramDay = {
  id: string
  programId: string
  dayOfWeek: number
  slotOrder: number
  templateId: string | null
  notes: string | null
}

export type ProgramWithDays = Program & {
  days: ProgramDay[]
}

export type CreateProgramInput = {
  name: string
  description?: string | null
}

export type CreateProgramDayInput = {
  dayOfWeek: number
  slotOrder: number
  templateId?: string | null
  notes?: string | null
}

export type UpdateProgramDayInput = {
  dayOfWeek?: number
  slotOrder?: number
  templateId?: string | null
  notes?: string | null
}

export type ListProgramsResult = {
  items: Program[]
  total: number
  page: number
  limit: number
}

export type ApplyProgramResult = {
  created: Array<{ id: string }>
  skipped: number
}
