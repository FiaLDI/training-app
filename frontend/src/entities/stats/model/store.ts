'use client'

import { create } from 'zustand'

import { useSessionStore } from '@/entities/session/model/store'
import { statsApi } from '@/entities/stats/api/stats-api'
import { markFetched, skipFreshFetch } from '@/shared/lib/fresh-fetch'
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
    yearRange: { from: string; to: string },
  ) => Promise<void>
  loadProgress: (
    key: string,
    exerciseId: string,
    range: { from: string; to: string },
  ) => Promise<void>
}

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

export const useStatsStore = create<StatsStore>((set, get) => ({
  overviewByKey: {},
  progressByKey: {},
  overviewError: null,
  progressError: null,

  async loadOverview(key, range, yearRange) {
    if (skipFreshFetch(`stats-overview:${key}`, Boolean(get().overviewByKey[key]))) return
    try {
      if (isLocalMode()) {
        const overview: StatsOverview = {
          volume: localData.stats.volume(range.from, range.to).map((p) => ({
            date: p.date,
            volume: Number(p.volume) || 0,
          })),
          muscleGroups: localData.stats.muscleGroups(range.from, range.to),
          activity: localData.stats.activity(yearRange.from, yearRange.to),
        }
        set((state) => ({
          overviewByKey: { ...state.overviewByKey, [key]: overview },
          overviewError: null,
        }))
        markFetched(`stats-overview:${key}`)
        return
      }

      const [volumeRes, groupsRes, activityRes] = await Promise.all([
        statsApi.volume(range),
        statsApi.muscleGroups(range),
        statsApi.activity(yearRange),
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
      markFetched(`stats-overview:${key}`)
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

  async loadProgress(key, exerciseId, range) {
    try {
      if (isLocalMode()) {
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
