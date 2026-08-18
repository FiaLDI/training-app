'use client'

import { useEffect, useMemo, useState } from 'react'

import { useSessionStore } from '@/entities/session/model/store'
import { trainingApi } from '@/entities/training/api/training-api'
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
    if (local && local.exercises.length > 0) {
      setDetails(local)
      return
    }

    if (mode === 'local') {
      setDetails(local)
      return
    }

    let cancelled = false
    void trainingApi
      .getById(training.id)
      .then((next) => {
        if (!cancelled) setDetails(next)
      })
      .catch(() => {
        if (!cancelled) setDetails(local)
      })

    return () => {
      cancelled = true
    }
  }, [training, mode])

  return { training, details }
}
