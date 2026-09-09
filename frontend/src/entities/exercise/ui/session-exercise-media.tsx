'use client'

import { useEffect, useState } from 'react'

import { getPrimaryImageUrls } from '@/entities/exercise/lib/primary-image'
import {
  muscleGroupIntensities,
  parseMuscleGroups,
} from '@/entities/exercise/model/muscle-groups'
import type { Exercise } from '@/entities/exercise/model/types'
import { ExerciseImage, EXERCISE_IMAGE_SIZES } from '@/entities/exercise/ui/exercise-image'
import {
  hasHighlightableMuscleGroups,
  MuscleDiagram,
} from '@/entities/exercise/ui/muscle-diagram'
import { cn } from '@/shared/lib/cn'

type Props = {
  exercise: Exercise
  showImage?: boolean
  showMuscleDiagram?: boolean
  className?: string
}

export function SessionExerciseMedia({
  exercise,
  showImage = true,
  showMuscleDiagram = true,
  className,
}: Props) {
  const image = showImage ? getPrimaryImageUrls(exercise) : null
  const [imageFailed, setImageFailed] = useState(false)
  const muscleGroups = parseMuscleGroups(exercise.muscleGroup)
  const showDiagram = showMuscleDiagram && hasHighlightableMuscleGroups(muscleGroups)
  const showPhoto = Boolean(image) && !imageFailed

  useEffect(() => {
    setImageFailed(false)
  }, [exercise.id, image?.src])

  if (!showPhoto && !showDiagram) return null

  return (
    <div
      className={cn(
        'mb-5 grid gap-3',
        showPhoto && showDiagram ? 'sm:grid-cols-[1.2fr_0.8fr]' : 'grid-cols-1',
        className,
      )}
    >
      {showPhoto && image ? (
        <div className="overflow-hidden rounded-xl bg-[var(--surface-2)]">
          <div className="relative aspect-[16/10] w-full">
            <ExerciseImage
              src={image.src}
              thumbUrl={image.thumbUrl}
              mediumUrl={image.mediumUrl}
              alt={exercise.name}
              sizes={EXERCISE_IMAGE_SIZES.session}
              className="object-contain"
              priority
              onUnavailable={() => setImageFailed(true)}
            />
          </div>
        </div>
      ) : null}

      {showDiagram ? (
        <div className="flex min-h-[12rem] items-center justify-center rounded-xl bg-[var(--surface)] px-2 py-4 sm:min-h-0">
          <MuscleDiagram
            groups={muscleGroups}
            intensityByGroup={muscleGroupIntensities(muscleGroups)}
          />
        </div>
      ) : null}
    </div>
  )
}
