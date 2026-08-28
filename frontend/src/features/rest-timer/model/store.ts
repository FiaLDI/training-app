'use client'

import { create } from 'zustand'

import {
  clearScheduledRestAlert,
  scheduleRestAlert,
  triggerRestAlerts,
} from '@/features/rest-timer/lib/rest-alerts'

export type RestTimerStatus = 'idle' | 'running' | 'paused' | 'finished'

type RestTimerState = {
  status: RestTimerStatus
  endsAt: number | null
  pausedRemaining: number | null
  totalSeconds: number

  getRemainingSeconds: () => number
  start: (seconds: number) => void
  pause: () => void
  resume: () => void
  skip: () => void
  dismiss: () => void
  adjust: (deltaSeconds: number) => void
  finish: () => void
}

function clampSeconds(value: number): number {
  return Math.max(0, Math.round(value))
}

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
  status: 'idle',
  endsAt: null,
  pausedRemaining: null,
  totalSeconds: 0,

  getRemainingSeconds() {
    const { status, endsAt, pausedRemaining } = get()
    if (status === 'paused' && pausedRemaining != null) return pausedRemaining
    if (status === 'running' && endsAt != null) {
      return clampSeconds((endsAt - Date.now()) / 1000)
    }
    if (status === 'finished') return 0
    return 0
  },

  start(seconds) {
    const totalSeconds = clampSeconds(seconds)
    if (totalSeconds <= 0) return

    clearScheduledRestAlert()
    const endsAt = Date.now() + totalSeconds * 1000
    set({
      status: 'running',
      endsAt,
      pausedRemaining: null,
      totalSeconds,
    })
    scheduleRestAlert(endsAt, () => {
      if (get().status === 'running') get().finish()
    })
  },

  pause() {
    const { status, endsAt } = get()
    if (status !== 'running' || endsAt == null) return

    clearScheduledRestAlert()
    const pausedRemaining = clampSeconds((endsAt - Date.now()) / 1000)
    set({
      status: 'paused',
      endsAt: null,
      pausedRemaining,
    })
  },

  resume() {
    const { status, pausedRemaining } = get()
    if (status !== 'paused' || pausedRemaining == null || pausedRemaining <= 0) {
      get().finish()
      return
    }

    const endsAt = Date.now() + pausedRemaining * 1000
    set({
      status: 'running',
      endsAt,
      pausedRemaining: null,
    })
    scheduleRestAlert(endsAt, () => {
      if (get().status === 'running') get().finish()
    })
  },

  skip() {
    clearScheduledRestAlert()
    set({
      status: 'idle',
      endsAt: null,
      pausedRemaining: null,
      totalSeconds: 0,
    })
  },

  dismiss() {
    clearScheduledRestAlert()
    set({
      status: 'idle',
      endsAt: null,
      pausedRemaining: null,
      totalSeconds: 0,
    })
  },

  adjust(deltaSeconds) {
    const { status, endsAt, pausedRemaining, totalSeconds } = get()
    if (status === 'idle' || status === 'finished') return

    if (status === 'paused' && pausedRemaining != null) {
      const next = clampSeconds(pausedRemaining + deltaSeconds)
      if (next <= 0) {
        get().finish()
        return
      }
      set({ pausedRemaining: next, totalSeconds: Math.max(totalSeconds, next) })
      return
    }

    if (status === 'running' && endsAt != null) {
      const nextEndsAt = endsAt + deltaSeconds * 1000
      const nextRemaining = clampSeconds((nextEndsAt - Date.now()) / 1000)
      if (nextRemaining <= 0) {
        clearScheduledRestAlert()
        get().finish()
        return
      }
      set({
        endsAt: nextEndsAt,
        totalSeconds: Math.max(totalSeconds, nextRemaining),
      })
      scheduleRestAlert(nextEndsAt, () => {
        if (get().status === 'running') get().finish()
      })
    }
  },

  finish() {
    clearScheduledRestAlert()
    const wasRunning = get().status === 'running' || get().status === 'paused'
    set({
      status: 'finished',
      endsAt: null,
      pausedRemaining: null,
    })
    if (wasRunning) {
      void triggerRestAlerts()
    }
  },
}))
