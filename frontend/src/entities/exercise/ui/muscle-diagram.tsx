'use client'

import { useId } from 'react'

import type { MuscleGroup } from '@/entities/exercise/model/muscle-groups'
import { cn } from '@/shared/lib/cn'

type RegionId =
  | 'chest'
  | 'frontDelts'
  | 'sideDelts'
  | 'rearDelts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'traps'
  | 'lats'
  | 'midBack'
  | 'lowerBack'
  | 'abs'
  | 'obliques'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'

const GROUP_TO_REGIONS: Partial<Record<MuscleGroup, RegionId[]>> = {
  грудь: ['chest'],
  'передние дельты': ['frontDelts'],
  'средние дельты': ['sideDelts'],
  'задние дельты': ['rearDelts'],
  бицепс: ['biceps'],
  трицепс: ['triceps'],
  предплечья: ['forearms'],
  трапеции: ['traps'],
  широчайшие: ['lats'],
  'середина спины': ['midBack'],
  поясница: ['lowerBack'],
  пресс: ['abs'],
  косые: ['obliques'],
  квадрицепс: ['quads'],
  'бицепс бедра': ['hamstrings'],
  ягодицы: ['glutes'],
  икры: ['calves'],
}

function activeRegions(groups: MuscleGroup[]): Set<RegionId> {
  const set = new Set<RegionId>()
  for (const group of groups) {
    for (const region of GROUP_TO_REGIONS[group] ?? []) {
      set.add(region)
    }
  }
  return set
}

type Props = {
  groups: MuscleGroup[]
  className?: string
}

type Paint = (region: RegionId) => {
  fill: string
  stroke: string
  strokeWidth: number
  filter?: string
}

/** Full athletic silhouette (head + torso + arms + legs), local coords ~100×190. */
const BODY_OUTLINE =
  'M50 8 C56 8 61 13 61 20 C61 26 57 30 53 31 L54 36 ' +
  'C62 35 70 38 74 44 C78 50 79 58 77 66 L74 78 C72 86 70 92 68 96 ' +
  'L70 118 C71 132 70 148 68 162 L66 178 C65 184 62 188 58 188 ' +
  'L54 188 C51 188 49 184 49 180 L50 162 C49 148 48 134 48 120 ' +
  'L50 120 C51 134 52 148 51 162 L52 180 C52 184 50 188 47 188 ' +
  'L42 188 C38 188 35 184 34 178 L32 162 C30 148 29 132 30 118 ' +
  'L32 96 C30 92 28 86 26 78 L23 66 C21 58 22 50 26 44 ' +
  'C30 38 38 35 46 36 L47 31 C43 30 39 26 39 20 C39 13 44 8 50 8 Z'

function Silhouette() {
  return (
    <path
      d={BODY_OUTLINE}
      fill="rgba(138,154,144,0.12)"
      stroke="rgba(138,154,144,0.45)"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  )
}

function FrontMuscles({ paint }: { paint: Paint }) {
  return (
    <g>
      {/* traps peek */}
      <path
        d="M46 32 C48 30 50 30 50 30 C50 30 52 30 54 32
           C53 35 52 36 50 36 C48 36 47 35 46 32 Z"
        {...paint('traps')}
      />

      {/* front delts */}
      <path
        d="M38 38 C42 35 46 35 48 37 C47 42 45 45 42 47 C39 45 38 42 38 38 Z"
        {...paint('frontDelts')}
      />
      <path
        d="M62 38 C58 35 54 35 52 37 C53 42 55 45 58 47 C61 45 62 42 62 38 Z"
        {...paint('frontDelts')}
      />

      {/* side delts */}
      <path
        d="M36 39 C32 42 29 48 28 54 C31 55 35 52 37 48 C37 44 37 41 36 39 Z"
        {...paint('sideDelts')}
      />
      <path
        d="M64 39 C68 42 71 48 72 54 C69 55 65 52 63 48 C63 44 63 41 64 39 Z"
        {...paint('sideDelts')}
      />

      {/* chest */}
      <path
        d="M40 40 C44 37 48 37 50 39 C52 37 56 37 60 40
           C61 46 60 52 58 56 C54 59 51 59.5 50 59.5 C49 59.5 46 59 42 56
           C40 52 39 46 40 40 Z"
        {...paint('chest')}
      />
      <path
        d="M50 40.5 V57"
        fill="none"
        stroke="rgba(11,17,16,0.28)"
        strokeWidth="0.55"
        strokeLinecap="round"
      />

      {/* biceps */}
      <path
        d="M32 52 C29 56 27 62 28 70 C31 71 34 69 36 65 C36 59 35 54 32 52 Z"
        {...paint('biceps')}
      />
      <path
        d="M68 52 C71 56 73 62 72 70 C69 71 66 69 64 65 C64 59 65 54 68 52 Z"
        {...paint('biceps')}
      />

      {/* forearms */}
      <path
        d="M28 70 C25 78 24 88 25 96 C28 97 31 94 32 88 C32 80 30 74 28 70 Z"
        {...paint('forearms')}
      />
      <path
        d="M72 70 C75 78 76 88 75 96 C72 97 69 94 68 88 C68 80 70 74 72 70 Z"
        {...paint('forearms')}
      />

      {/* abs */}
      <path
        d="M45 58 C48 57 50 57 50 57 C50 57 52 57 55 58
           C56 66 55 76 54 86 C52 88 50 88.5 50 88.5 C50 88.5 48 88 46 86
           C45 76 44 66 45 58 Z"
        {...paint('abs')}
      />
      <path
        d="M50 59.5 V85 M46 66 H54 M46 74 H54 M46 81 H54"
        fill="none"
        stroke="rgba(11,17,16,0.22)"
        strokeWidth="0.45"
        strokeLinecap="round"
      />

      {/* obliques */}
      <path
        d="M40 57 C44 58 45 59 45 59 L46 86 C42 84 38 76 36 68 C37 61 39 58 40 57 Z"
        {...paint('obliques')}
      />
      <path
        d="M60 57 C56 58 55 59 55 59 L54 86 C58 84 62 76 64 68 C63 61 61 58 60 57 Z"
        {...paint('obliques')}
      />

      {/* quads */}
      <path
        d="M42 98 C40 112 38 130 37 148 C41 150 46 148 48 136 C50 120 50 106 48 100 C46 98 44 98 42 98 Z"
        {...paint('quads')}
      />
      <path
        d="M58 98 C60 112 62 130 63 148 C59 150 54 148 52 136 C50 120 50 106 52 100 C54 98 56 98 58 98 Z"
        {...paint('quads')}
      />

      {/* calves */}
      <path
        d="M38 148 C36 158 35 168 36 178 C40 179 44 176 45 168 C45 158 43 152 41 148 Z"
        {...paint('calves')}
      />
      <path
        d="M62 148 C64 158 65 168 64 178 C60 179 56 176 55 168 C55 158 57 152 59 148 Z"
        {...paint('calves')}
      />
    </g>
  )
}

function BackMuscles({ paint }: { paint: Paint }) {
  return (
    <g>
      {/* traps */}
      <path
        d="M42 32 C46 28 50 27 50 27 C50 27 54 28 58 32
           C57 38 54 42 50 42.5 C46 42 43 38 42 32 Z"
        {...paint('traps')}
      />

      {/* rear delts */}
      <path
        d="M38 38 C42 35 46 36 48 38 C47 43 44 46 41 47 C38 45 38 42 38 38 Z"
        {...paint('rearDelts')}
      />
      <path
        d="M62 38 C58 35 54 36 52 38 C53 43 56 46 59 47 C62 45 62 42 62 38 Z"
        {...paint('rearDelts')}
      />

      {/* side delts */}
      <path
        d="M36 39 C32 42 29 48 28 54 C31 55 35 52 37 48 C37 44 37 41 36 39 Z"
        {...paint('sideDelts')}
      />
      <path
        d="M64 39 C68 42 71 48 72 54 C69 55 65 52 63 48 C63 44 63 41 64 39 Z"
        {...paint('sideDelts')}
      />

      {/* mid back */}
      <path
        d="M46 42 C48 41 50 40.5 50 40.5 C50 40.5 52 41 54 42
           C55 50 54 58 53 66 C51 68 50 68.5 50 68.5 C50 68.5 49 68 47 66
           C46 58 45 50 46 42 Z"
        {...paint('midBack')}
      />

      {/* lats */}
      <path
        d="M36 44 C42 41 46 43 46 43 L47 66 C43 71 38 68 33 58 C33 51 34 46 36 44 Z"
        {...paint('lats')}
      />
      <path
        d="M64 44 C58 41 54 43 54 43 L53 66 C57 71 62 68 67 58 C67 51 66 46 64 44 Z"
        {...paint('lats')}
      />

      {/* lower back */}
      <path
        d="M46 66 C48 65 50 65 50 65 C50 65 52 65 54 66
           C55 74 54 82 53 90 C51 92 50 92.5 50 92.5 C50 92.5 49 92 47 90
           C46 82 45 74 46 66 Z"
        {...paint('lowerBack')}
      />

      {/* triceps */}
      <path
        d="M32 52 C29 56 27 62 28 70 C31 71 34 69 36 65 C36 59 35 54 32 52 Z"
        {...paint('triceps')}
      />
      <path
        d="M68 52 C71 56 73 62 72 70 C69 71 66 69 64 65 C64 59 65 54 68 52 Z"
        {...paint('triceps')}
      />

      {/* forearms */}
      <path
        d="M28 70 C25 78 24 88 25 96 C28 97 31 94 32 88 C32 80 30 74 28 70 Z"
        {...paint('forearms')}
      />
      <path
        d="M72 70 C75 78 76 88 75 96 C72 97 69 94 68 88 C68 80 70 74 72 70 Z"
        {...paint('forearms')}
      />

      {/* glutes */}
      <path
        d="M40 90 C45 88 50 88 50 88 C50 88 55 88 60 90
           C62 96 61 104 58 108 C54 111 50 111.5 50 111.5 C50 111.5 46 111 42 108
           C39 104 38 96 40 90 Z"
        {...paint('glutes')}
      />
      <path
        d="M50 89.5 V109"
        fill="none"
        stroke="rgba(11,17,16,0.28)"
        strokeWidth="0.55"
        strokeLinecap="round"
      />

      {/* hamstrings */}
      <path
        d="M42 110 C40 122 38 136 37 150 C41 152 47 150 48 138 C50 124 49 114 47 111 C45 110 43 110 42 110 Z"
        {...paint('hamstrings')}
      />
      <path
        d="M58 110 C60 122 62 136 63 150 C59 152 53 150 52 138 C50 124 51 114 53 111 C55 110 57 110 58 110 Z"
        {...paint('hamstrings')}
      />

      {/* calves */}
      <path
        d="M38 150 C36 160 35 170 36 178 C40 179 44 176 45 168 C45 160 43 154 41 150 Z"
        {...paint('calves')}
      />
      <path
        d="M62 150 C64 160 65 170 64 178 C60 179 56 176 55 168 C55 160 57 154 59 150 Z"
        {...paint('calves')}
      />
    </g>
  )
}

function Figure({
  label,
  paint,
  side,
}: {
  label: string
  paint: Paint
  side: 'front' | 'back'
}) {
  return (
    <g>
      <text
        x="50"
        y="0"
        textAnchor="middle"
        fill="var(--muted)"
        style={{ fontSize: 7.5, letterSpacing: '0.08em', fontWeight: 600 }}
      >
        {label}
      </text>
      <g transform="translate(0, 8)">
        <Silhouette />
        {side === 'front' ? <FrontMuscles paint={paint} /> : <BackMuscles paint={paint} />}
      </g>
    </g>
  )
}

export function MuscleDiagram({ groups, className }: Props) {
  const uid = useId().replace(/:/g, '')
  const activeFillId = `muscleActive-${uid}`
  const glowId = `muscleGlow-${uid}`
  const active = activeRegions(groups)
  const highlighted = groups.filter((group) => group !== 'другое')

  const paint: Paint = (region) => {
    const on = active.has(region)
    return {
      fill: on ? `url(#${activeFillId})` : 'rgba(138,154,144,0.08)',
      stroke: on ? 'rgba(252,165,165,0.75)' : 'rgba(138,154,144,0.14)',
      strokeWidth: on ? 0.9 : 0.4,
      filter: on ? `url(#${glowId})` : undefined,
    }
  }

  return (
    <div className={cn('flex w-full flex-col items-center gap-3', className)}>
      <svg
        viewBox="0 0 240 220"
        className="h-44 w-full max-w-[300px]"
        role="img"
        aria-label={
          highlighted.length > 0
            ? `Мышцы: ${highlighted.join(', ')}`
            : 'Схема мышц'
        }
      >
        <defs>
          <linearGradient id={activeFillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#ef4444" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.82" />
          </linearGradient>
          <filter id={glowId} x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="0.9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform="translate(10, 14)">
          <Figure label="СПЕРЕДИ" paint={paint} side="front" />
        </g>
        <g transform="translate(130, 14)">
          <Figure label="СЗАДИ" paint={paint} side="back" />
        </g>
      </svg>

      {highlighted.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-1.5 px-1">
          {highlighted.map((group) => (
            <span
              key={group}
              className="rounded-md px-2 py-1 text-[11px] leading-none text-red-100/95"
              style={{
                background: 'rgba(239, 68, 68, 0.16)',
                border: '1px solid rgba(248, 113, 113, 0.35)',
              }}
            >
              {group}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function hasHighlightableMuscleGroups(groups: MuscleGroup[]): boolean {
  return groups.some(
    (group) => group !== 'другое' && Boolean(GROUP_TO_REGIONS[group]),
  )
}
