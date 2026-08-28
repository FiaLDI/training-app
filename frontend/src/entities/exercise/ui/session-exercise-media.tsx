'use client'

import { getPrimaryImageUrl } from '@/entities/exercise/lib/primary-image'
import {
  hasHighlightableMuscleGroups,
  MuscleDiagram,
} from '@/entities/exercise/ui/muscle-diagram'
import { parseMuscleGroups } from '@/entities/exercise/model/muscle-groups'
import type { Exercise } from '@/entities/exercise/model/types'
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
  const imageUrl = showImage ? getPrimaryImageUrl(exercise) : null
  const muscleGroups = parseMuscleGroups(exercise.muscleGroup)
  const showDiagram = showMuscleDiagram && hasHighlightableMuscleGroups(muscleGroups)

  if (!imageUrl && !showDiagram) return null

  return (
    <div
      className={cn(
        'mb-5 grid gap-3',
        imageUrl && showDiagram ? 'sm:grid-cols-[1.2fr_0.8fr]' : 'grid-cols-1',
        className,
      )}
    >
      {imageUrl ? (
        <div className="overflow-hidden rounded-xl bg-[var(--surface-2)]">
          <div className="relative aspect-[16/10] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={exercise.name}
              className="size-full object-contain"
            />
          </div>
        </div>
      ) : null}

      {showDiagram ? (
        <div className="flex min-h-[12rem] items-center justify-center rounded-xl bg-[var(--surface)] px-2 py-4 sm:min-h-0">
          <MuscleDiagram groups={muscleGroups} />
        </div>
      ) : null}
    </div>
  )
}
