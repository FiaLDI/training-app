import Link from 'next/link'

import { getPrimaryImageUrl } from '@/entities/exercise/lib/primary-image'
import { parseMuscleGroups } from '@/entities/exercise/model/muscle-groups'
import type { Exercise } from '@/entities/exercise/model/types'
import { parseEquipmentNames } from '@/entities/equipment/model/types'

type Props = {
  exercise: Exercise
}

export function ExerciseCard({ exercise }: Props) {
  const muscleGroups = parseMuscleGroups(exercise.muscleGroup)
  const equipment = parseEquipmentNames(exercise.equipment)
  const imageUrl = getPrimaryImageUrl(exercise)

  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="group block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)]"
    >
      {imageUrl ? (
        <div className="aspect-[16/10] bg-[var(--surface-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="size-full object-cover transition group-hover:brightness-110"
          />
        </div>
      ) : null}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--foreground)] group-hover:text-[var(--accent)]">
            {exercise.name}
          </h3>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
          {exercise.description || 'No description'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          {muscleGroups.map((group) => (
            <span
              key={group}
              className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-[var(--foreground)]"
            >
              {group}
            </span>
          ))}
          {equipment.map((item) => (
            <span
              key={item}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-[var(--muted)]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
