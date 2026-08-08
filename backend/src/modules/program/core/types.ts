export interface Program {
  id: string
  userId: string
  name: string
  description: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ProgramDay {
  id: string
  programId: string
  dayOfWeek: number
  slotOrder: number
  templateId: string | null
  notes: string | null
}

export interface ProgramWithDays extends Program {
  days: ProgramDay[]
}
