export interface UpdateProgramDayInput {
  id: string
  userId: string
  dayOfWeek?: number
  slotOrder?: number
  templateId?: string | null
  notes?: string | null
}
