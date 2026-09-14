import type { Training, TrainingWithDetails } from '@/entities/training/model/types'

export type CoachPerson = {
  id: string
  relationshipId: string
  username: string
  email: string
  since: string
}

export type CoachInvite = {
  id: string
  code: string
  createdAt: string
  expiresAt: string
}

export type ProgramAssignment = {
  id: string
  sourceProgramId: string
  traineeProgramId: string
  status: 'active' | 'archived'
  createdAt: string
}

export type SetComment = {
  id: string
  setId: string
  authorId: string
  authorUsername: string
  body: string
  createdAt: string
}

export type AssignProgramResult = {
  assignmentId: string
  traineeProgramId: string
  skippedExercises: string[]
  applied?: { created: number; skipped: number }
}

export type TraineeTrainingView = {
  training: TrainingWithDetails
  comments: SetComment[]
}

export type ListTrainingsResult = {
  items: Training[]
  total: number
  page: number
  limit: number
}
