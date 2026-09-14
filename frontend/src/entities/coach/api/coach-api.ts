import { apiRequest } from '@/shared/api/client'

import type {
  AssignProgramResult,
  CoachInvite,
  CoachPerson,
  ListTrainingsResult,
  ProgramAssignment,
  SetComment,
  TraineeTrainingView,
} from '../model/types'

export const coachApi = {
  createInvite() {
    return apiRequest<CoachInvite>('/coach/invites', { method: 'POST' })
  },

  listInvites() {
    return apiRequest<{ items: CoachInvite[] }>('/coach/invites')
  },

  revokeInvite(id: string) {
    return apiRequest<{ revoked: boolean }>(`/coach/invites/${id}`, { method: 'DELETE' })
  },

  join(code: string) {
    return apiRequest<CoachPerson>('/coach/join', { method: 'POST', body: { code } })
  },

  listTrainees() {
    return apiRequest<{ items: CoachPerson[] }>('/coach/trainees')
  },

  listCoaches() {
    return apiRequest<{ items: CoachPerson[] }>('/coach/coaches')
  },

  endRelationship(id: string) {
    return apiRequest<{ ended: boolean }>(`/coach/relationships/${id}`, { method: 'DELETE' })
  },

  assignProgram(input: { traineeId: string; programId: string; weekStart?: string }) {
    return apiRequest<AssignProgramResult>('/coach/assignments', {
      method: 'POST',
      body: input,
    })
  },

  listAssignments(traineeId: string) {
    return apiRequest<{ items: ProgramAssignment[] }>(`/coach/trainees/${traineeId}/assignments`)
  },

  listTrainings(traineeId: string, params: { from?: string; to?: string } = {}) {
    const search = new URLSearchParams()
    if (params.from) search.set('from', params.from)
    if (params.to) search.set('to', params.to)
    const qs = search.toString()
    return apiRequest<ListTrainingsResult>(
      `/coach/trainees/${traineeId}/trainings${qs ? `?${qs}` : ''}`,
    )
  },

  getTraining(traineeId: string, trainingId: string) {
    return apiRequest<TraineeTrainingView>(
      `/coach/trainees/${traineeId}/trainings/${trainingId}`,
    )
  },

  listComments(trainingId: string) {
    return apiRequest<{ items: SetComment[] }>(
      `/coach/comments?trainingId=${encodeURIComponent(trainingId)}`,
    )
  },

  addComment(setId: string, body: string) {
    return apiRequest<SetComment>(`/coach/sets/${setId}/comments`, {
      method: 'POST',
      body: { body },
    })
  },
}
