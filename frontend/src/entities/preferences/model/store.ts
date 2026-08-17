'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_SET_STEP = 1

function sanitizeStep(value: unknown, fallback = DEFAULT_SET_STEP): number {
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.round(parsed * 1000) / 1000
}

type PreferencesState = {
  weightStep: number
  repsStep: number
  setWeightStep: (value: number) => void
  setRepsStep: (value: number) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      weightStep: DEFAULT_SET_STEP,
      repsStep: DEFAULT_SET_STEP,
      setWeightStep(value) {
        set({ weightStep: sanitizeStep(value) })
      },
      setRepsStep(value) {
        set({ repsStep: sanitizeStep(value) })
      },
    }),
    {
      name: 'ironlog:preferences',
      partialize: (state) => ({
        weightStep: state.weightStep,
        repsStep: state.repsStep,
      }),
      merge: (persisted, current) => {
        const stored =
          persisted && typeof persisted === 'object'
            ? (persisted as Partial<PreferencesState>)
            : {}
        return {
          ...current,
          weightStep: sanitizeStep(stored.weightStep),
          repsStep: sanitizeStep(stored.repsStep),
        }
      },
    },
  ),
)
