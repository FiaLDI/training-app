'use client'

import type { MuscleGroup } from '@/entities/exercise/model/muscle-groups'
import { cn } from '@/shared/lib/cn'

import {
  ANTERIOR_REGIONS,
  POSTERIOR_REGIONS,
  type DiagramMuscle,
  type MuscleRegion,
} from './muscle-diagram-assets'

const HIGHLIGHT_COLORS = [
  'rgba(190, 242, 100, 0.42)',
  'rgba(163, 230, 53, 0.58)',
  'rgba(163, 230, 53, 0.72)',
  'rgba(132, 204, 22, 0.85)',
  '#a3e635',
] as const

const BODY_COLOR = 'rgba(30, 42, 38, 0.72)'

const GROUP_TO_SLUGS: Partial<Record<MuscleGroup, DiagramMuscle[]>> = {
  грудь: ['chest'],
  'передние дельты': ['front-deltoids'],
  'средние дельты': ['front-deltoids', 'back-deltoids'],
  'задние дельты': ['back-deltoids'],
  бицепс: ['biceps'],
  трицепс: ['triceps'],
  предплечья: ['forearm'],
  трапеции: ['trapezius'],
  широчайшие: ['upper-back'],
  'середина спины': ['upper-back'],
  поясница: ['lower-back'],
  пресс: ['abs'],
  косые: ['obliques'],
  квадрицепс: ['quadriceps'],
  'бицепс бедра': ['hamstring'],
  ягодицы: ['gluteal'],
  икры: ['calves', 'left-soleus', 'right-soleus'],
}

type Props = {
  groups: MuscleGroup[]
  className?: string
  /** 0–1 на группу: яркость подсветки пропорциональна объёму */
  intensityByGroup?: Partial<Record<MuscleGroup, number>>
}

function colorForIntensity(intensity: number): string {
  const index = Math.max(
    0,
    Math.min(HIGHLIGHT_COLORS.length - 1, Math.ceil(intensity * HIGHLIGHT_COLORS.length) - 1),
  )
  return HIGHLIGHT_COLORS[index]
}

function buildMuscleIntensity(
  groups: MuscleGroup[],
  intensityByGroup?: Partial<Record<MuscleGroup, number>>,
): Map<DiagramMuscle, number> {
  const map = new Map<DiagramMuscle, number>()

  for (const group of groups) {
    const slugs = GROUP_TO_SLUGS[group]
    if (!slugs) continue

    const intensity = intensityByGroup?.[group] ?? 1
    for (const slug of slugs) {
      map.set(slug, Math.max(map.get(slug) ?? 0, intensity))
    }
  }

  return map
}

function MuscleSvg({
  regions,
  muscleIntensity,
}: {
  regions: MuscleRegion[]
  muscleIntensity: Map<DiagramMuscle, number>
}) {
  return (
    <svg
      className="muscle-diagram-svg"
      viewBox="0 0 100 200"
      width="100%"
      height="100%"
      style={{ width: '100%', height: 'auto' }}
    >
      {regions.flatMap((region) =>
        region.points.map((points, index) => {
          const intensity = muscleIntensity.get(region.muscle)
          return (
            <polygon
              key={`${region.muscle}-${index}`}
              points={points}
              fill={intensity ? colorForIntensity(intensity) : BODY_COLOR}
            />
          )
        }),
      )}
    </svg>
  )
}

function BodyView({
  label,
  regions,
  muscleIntensity,
}: {
  label: string
  regions: MuscleRegion[]
  muscleIntensity: Map<DiagramMuscle, number>
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </span>
      <div className="w-full max-w-[148px]">
        <MuscleSvg regions={regions} muscleIntensity={muscleIntensity} />
      </div>
    </div>
  )
}

export function MuscleDiagram({ groups, className, intensityByGroup }: Props) {
  const muscleIntensity = buildMuscleIntensity(groups, intensityByGroup)
  const highlighted = groups.filter((group) => group !== 'другое' && GROUP_TO_SLUGS[group])

  return (
    <div className={cn('flex w-full flex-col items-center gap-3', className)}>
      <div
        className="muscle-diagram-panel flex w-full max-w-[320px] items-center justify-center gap-1 rounded-xl bg-[var(--surface-2)]/50 px-3 py-4"
        role="img"
        aria-label={
          highlighted.length > 0 ? `Мышцы: ${highlighted.join(', ')}` : 'Схема мышц'
        }
      >
        <BodyView label="Спереди" regions={ANTERIOR_REGIONS} muscleIntensity={muscleIntensity} />
        <BodyView label="Сзади" regions={POSTERIOR_REGIONS} muscleIntensity={muscleIntensity} />
      </div>

      {highlighted.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-1.5 px-1">
          {highlighted.map((group) => {
            const intensity = intensityByGroup?.[group] ?? 1
            return (
              <span
                key={group}
                className="rounded-md border border-[var(--accent)]/35 bg-[var(--accent)]/12 px-2 py-1 text-[11px] leading-none text-[#d9f99d]"
                style={{ opacity: 0.5 + intensity * 0.5 }}
              >
                {group}
              </span>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function hasHighlightableMuscleGroups(groups: MuscleGroup[]): boolean {
  return groups.some((group) => group !== 'другое' && Boolean(GROUP_TO_SLUGS[group]))
}
