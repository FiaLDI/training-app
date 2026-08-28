'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_SET_STEP = 1
export const DEFAULT_REST_SECONDS = 90

function sanitizeStep(value: unknown, fallback = DEFAULT_SET_STEP): number {
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.round(parsed * 1000) / 1000
}

function sanitizeRestSeconds(value: unknown, fallback = DEFAULT_REST_SECONDS): number {
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed < 15 || parsed > 600) return fallback
  return Math.round(parsed)
}

type PreferencesState = {
  weightStep: number
  repsStep: number
  defaultRestSeconds: number
  autoStartRestTimer: boolean
  restTimerSkipWarmup: boolean
  restTimerSound: boolean
  restTimerVibration: boolean
  restTimerNotifications: boolean
  showSessionExerciseImage: boolean
  showSessionMuscleDiagram: boolean
  showSessionVideo: boolean
  showSessionNotes: boolean
  setWeightStep: (value: number) => void
  setRepsStep: (value: number) => void
  setDefaultRestSeconds: (value: number) => void
  setAutoStartRestTimer: (value: boolean) => void
  setRestTimerSkipWarmup: (value: boolean) => void
  setRestTimerSound: (value: boolean) => void
  setRestTimerVibration: (value: boolean) => void
  setRestTimerNotifications: (value: boolean) => void
  setShowSessionExerciseImage: (value: boolean) => void
  setShowSessionMuscleDiagram: (value: boolean) => void
  setShowSessionVideo: (value: boolean) => void
  setShowSessionNotes: (value: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      weightStep: DEFAULT_SET_STEP,
      repsStep: DEFAULT_SET_STEP,
      defaultRestSeconds: DEFAULT_REST_SECONDS,
      autoStartRestTimer: true,
      restTimerSkipWarmup: true,
      restTimerSound: true,
      restTimerVibration: true,
      restTimerNotifications: false,
      showSessionExerciseImage: true,
      showSessionMuscleDiagram: true,
      showSessionVideo: true,
      showSessionNotes: true,
      setWeightStep(value) {
        set({ weightStep: sanitizeStep(value) })
      },
      setRepsStep(value) {
        set({ repsStep: sanitizeStep(value) })
      },
      setDefaultRestSeconds(value) {
        set({ defaultRestSeconds: sanitizeRestSeconds(value) })
      },
      setAutoStartRestTimer(value) {
        set({ autoStartRestTimer: value })
      },
      setRestTimerSkipWarmup(value) {
        set({ restTimerSkipWarmup: value })
      },
      setRestTimerSound(value) {
        set({ restTimerSound: value })
      },
      setRestTimerVibration(value) {
        set({ restTimerVibration: value })
      },
      setRestTimerNotifications(value) {
        set({ restTimerNotifications: value })
      },
      setShowSessionExerciseImage(value) {
        set({ showSessionExerciseImage: value })
      },
      setShowSessionMuscleDiagram(value) {
        set({ showSessionMuscleDiagram: value })
      },
      setShowSessionVideo(value) {
        set({ showSessionVideo: value })
      },
      setShowSessionNotes(value) {
        set({ showSessionNotes: value })
      },
    }),
    {
      name: 'ironlog:preferences',
      partialize: (state) => ({
        weightStep: state.weightStep,
        repsStep: state.repsStep,
        defaultRestSeconds: state.defaultRestSeconds,
        autoStartRestTimer: state.autoStartRestTimer,
        restTimerSkipWarmup: state.restTimerSkipWarmup,
        restTimerSound: state.restTimerSound,
        restTimerVibration: state.restTimerVibration,
        restTimerNotifications: state.restTimerNotifications,
        showSessionExerciseImage: state.showSessionExerciseImage,
        showSessionMuscleDiagram: state.showSessionMuscleDiagram,
        showSessionVideo: state.showSessionVideo,
        showSessionNotes: state.showSessionNotes,
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
          defaultRestSeconds: sanitizeRestSeconds(stored.defaultRestSeconds),
          autoStartRestTimer: stored.autoStartRestTimer ?? current.autoStartRestTimer,
          restTimerSkipWarmup: stored.restTimerSkipWarmup ?? current.restTimerSkipWarmup,
          restTimerSound: stored.restTimerSound ?? current.restTimerSound,
          restTimerVibration: stored.restTimerVibration ?? current.restTimerVibration,
          restTimerNotifications:
            stored.restTimerNotifications ?? current.restTimerNotifications,
          showSessionExerciseImage:
            stored.showSessionExerciseImage ?? current.showSessionExerciseImage,
          showSessionMuscleDiagram:
            stored.showSessionMuscleDiagram ?? current.showSessionMuscleDiagram,
          showSessionVideo: stored.showSessionVideo ?? current.showSessionVideo,
          showSessionNotes: stored.showSessionNotes ?? current.showSessionNotes,
        }
      },
    },
  ),
)
