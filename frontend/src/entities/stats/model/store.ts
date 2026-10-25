'use client'

import { create } from 'zustand'

import { useSessionStore } from '@/entities/session/model/store'
import { statsApi } from '@/entities/stats/api/stats-api'
import { localData } from '@/shared/lib/local-data'

import type {
  ActivityStatPoint,
  ExerciseProgressPoint,
  MuscleGroupStatPoint,
  StrengthCorrelationPoint,
  VolumeStatPoint,
} from './types'

export type StatsOverview = {
  volume: VolumeStatPoint[]
  muscleGroups: MuscleGroupStatPoint[]
  activity: ActivityStatPoint[]
}

export type StatsProgress = {
  progress: ExerciseProgressPoint[]
  correlation: StrengthCorrelationPoint[]
}

type StatsStore = {
  overviewByKey: Record<string, StatsOverview>
  progressByKey: Record<string, StatsProgress>
  overviewError: string | null
  progressError: string | null
  loadOverview: (
    key: string,
    range: { from: string; to: string },
  ) => Promise<void>
  hydrateOverviewFromLocal: (key: string, range: { from: string; to: string }) => void
  loadProgress: (
    key: string,
    exerciseId: string,
    range: { from: string; to: string },
  ) => Promise<void>
  hydrateProgressFromLocal: (
    key: string,
    exerciseId: string,
    range: { from: string; to: string },
  ) => void
}

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

function overviewFromLocal(range: { from: string; to: string }): StatsOverview {
  return {
    volume: localData.stats.volume(range.from, range.to).map((p) => ({
      date: p.date,
      volume: Number(p.volume) || 0,
    })),
    muscleGroups: localData.stats.muscleGroups(range.from, range.to),
    activity: localData.stats.activity(range.from, range.to),
  }
}

export const useStatsStore = create<StatsStore>((set, get) => ({
  overviewByKey: {},
  progressByKey: {},
  overviewError: null,
  progressError: null,

  async loadOverview(key, range) {
    try {
      if (isLocalMode()) {
        get().hydrateOverviewFromLocal(key, range)
        return
      }

      const [volumeRes, groupsRes, activityRes] = await Promise.all([
        statsApi.volume(range),
        statsApi.muscleGroups(range),
        statsApi.activity(range),
      ])
      set((state) => ({
        overviewByKey: {
          ...state.overviewByKey,
          [key]: {
            volume: volumeRes.points.map((p) => ({
              date: p.date,
              volume: Number(p.volume) || 0,
            })),
            muscleGroups: groupsRes.groups,
            activity: activityRes.points,
          },
        },
        overviewError: null,
      }))
    } catch (error) {
      if (get().overviewByKey[key]) {
        set({ overviewError: null })
        return
      }
      set({
        overviewError: error instanceof Error ? error.message : 'Не удалось загрузить статистику',
      })
    }
  },

  hydrateOverviewFromLocal(key, range) {
    set((state) => ({
      overviewByKey: { ...state.overviewByKey, [key]: overviewFromLocal(range) },
      overviewError: null,
    }))
  },

  hydrateProgressFromLocal(key, exerciseId, range) {
    const progress = localData.stats.exerciseProgress(exerciseId, range.from, range.to)
    const correlation = localData.stats.strengthCorrelation(exerciseId, range.from, range.to)
    set((state) => ({
      progressByKey: {
        ...state.progressByKey,
        [key]: {
          progress: progress.map((p) => ({
            date: p.date,
            maxWeight: p.maxWeight == null ? null : Number(p.maxWeight),
            bestVolume: Number(p.bestVolume) || 0,
          })),
          correlation,
        },
      },
      progressError: null,
    }))
  },

  async loadProgress(key, exerciseId, range) {
    try {
      if (isLocalMode()) {
        get().hydrateProgressFromLocal(key, exerciseId, range)
        return
      }

      const [progressRes, corrRes] = await Promise.all([
        statsApi.exerciseProgress({ exerciseId, ...range }),
        statsApi.strengthCorrelation({ exerciseId, ...range }),
      ])
      set((state) => ({
        progressByKey: {
          ...state.progressByKey,
          [key]: {
            progress: progressRes.points.map((p) => ({
              date: p.date,
              maxWeight: p.maxWeight == null ? null : Number(p.maxWeight),
              bestVolume: Number(p.bestVolume) || 0,
            })),
            correlation: corrRes.points,
          },
        },
        progressError: null,
      }))
    } catch (error) {
      if (get().progressByKey[key]) {
        set({ progressError: null })
        return
      }
      set({
        progressError: error instanceof Error ? error.message : 'Не удалось загрузить прогресс',
      })
    }
  },
}))
