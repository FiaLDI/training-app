export interface Program {
  id: string
  userId: string | null
  isSystem: boolean
  name: string
  description: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  /** Number of day slots; present on list payloads. */
  dayCount?: number
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
