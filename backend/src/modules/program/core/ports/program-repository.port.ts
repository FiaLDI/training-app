import { Program, ProgramDay, ProgramWithDays } from '../types'

export interface ListProgramsRepositoryInput {
  userId: string
  page: number
  limit: number
}

export interface ListProgramsRepositoryOutput {
  items: Program[]
  total: number
  page: number
  limit: number
}

export interface CreateProgramRepositoryInput {
  userId: string
  name: string
  description?: string | null
  metadata?: Record<string, unknown>
}

export interface UpdateProgramRepositoryInput {
  id: string
  userId: string
  name?: string
  description?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateProgramDayRepositoryInput {
  programId: string
  userId: string
  dayOfWeek: number
  slotOrder: number
  templateId?: string | null
  notes?: string | null
}

export interface UpdateProgramDayRepositoryInput {
  id: string
  userId: string
  dayOfWeek?: number
  slotOrder?: number
  templateId?: string | null
  notes?: string | null
}

export interface ProgramRepositoryPort {
  list(input: ListProgramsRepositoryInput): Promise<ListProgramsRepositoryOutput>
  getById(id: string, userId: string): Promise<ProgramWithDays | null>
  create(input: CreateProgramRepositoryInput): Promise<Program>
  update(input: UpdateProgramRepositoryInput): Promise<Program | null>
  delete(id: string, userId: string): Promise<boolean>

  listDays(programId: string): Promise<ProgramDay[]>
  createDay(input: CreateProgramDayRepositoryInput): Promise<ProgramDay | null>
  updateDay(input: UpdateProgramDayRepositoryInput): Promise<ProgramDay | null>
  deleteDay(id: string, userId: string): Promise<boolean>
}

export const PROGRAM_REPOSITORY_PORT = Symbol('PROGRAM_REPOSITORY_PORT')
