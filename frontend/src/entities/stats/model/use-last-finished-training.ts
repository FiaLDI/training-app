'use client'

import { useEffect, useMemo, useState } from 'react'

import { useSessionStore } from '@/entities/session/model/store'
import { pullCloudTrainingDetails } from '@/entities/training/lib/pull-cloud-training'
import { useTrainingStore } from '@/entities/training/model/store'
import type { Training, TrainingWithDetails } from '@/entities/training/model/types'
import { localData } from '@/shared/lib/local-data'

export function useLastFinishedTraining() {
  const mode = useSessionStore((s) => s.mode)
  const trainings = useTrainingStore((s) => s.items)
  const [details, setDetails] = useState<TrainingWithDetails | null>(null)

  const training = useMemo((): Training | null => {
    return (
      trainings
        .filter((item) => item.status === 'finished')
        .sort((a, b) => {
          const aKey = a.finishedAt ?? a.startedAt ?? a.createdAt
          const bKey = b.finishedAt ?? b.startedAt ?? b.createdAt
          return bKey.localeCompare(aKey)
        })[0] ?? null
    )
  }, [trainings])

  useEffect(() => {
    if (!training) {
      setDetails(null)
      return
    }

    const local = localData.trainings.get(training.id)
    if (local) setDetails(local)

    if (mode === 'local') return

    const hasSets = Boolean(local?.exercises.some((exercise) => exercise.sets.length > 0))
    if (hasSets) return

    let cancelled = false
    void pullCloudTrainingDetails(training.id, 8000).then(() => {
      if (!cancelled) setDetails(localData.trainings.get(training.id) ?? local)
    })

    return () => {
      cancelled = true
    }
  }, [training, mode])

  return { training, details }
}
