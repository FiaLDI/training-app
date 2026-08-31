export const MUSCLE_GROUPS = [
  'грудь',
  'передние дельты',
  'средние дельты',
  'задние дельты',
  'бицепс',
  'трицепс',
  'предплечья',
  'трапеции',
  'широчайшие',
  'середина спины',
  'поясница',
  'пресс',
  'косые',
  'квадрицепс',
  'бицепс бедра',
  'ягодицы',
  'икры',
  'другое',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

/** Primary muscle group contribution; first listed group in `muscleGroup`. */
export const PRIMARY_MUSCLE_WEIGHT = 1
/** Each additional (secondary) muscle group contribution. */
export const SECONDARY_MUSCLE_WEIGHT = 0.6

const LEGACY_MUSCLE_GROUP_EXPAND: Record<string, readonly MuscleGroup[]> = {
  руки: ['бицепс', 'трицепс', 'предплечья'],
  плечи: ['передние дельты', 'средние дельты', 'задние дельты'],
  ноги: ['квадрицепс', 'бицепс бедра', 'ягодицы', 'икры'],
  спина: ['трапеции', 'широчайшие', 'середина спины', 'поясница'],
}

const MUSCLE_GROUP_SET = new Set<string>(MUSCLE_GROUPS)

export function parseMuscleGroups(value: string | null | undefined): MuscleGroup[] {
  if (!value) return []

  const result: MuscleGroup[] = []
  const seen = new Set<MuscleGroup>()

  for (const raw of value.split(',')) {
    const item = raw.trim()
    if (!item) continue

    const expanded = LEGACY_MUSCLE_GROUP_EXPAND[item]
    if (expanded) {
      for (const group of expanded) {
        if (!seen.has(group)) {
          seen.add(group)
          result.push(group)
        }
      }
      continue
    }

    if (MUSCLE_GROUP_SET.has(item)) {
      const group = item as MuscleGroup
      if (!seen.has(group)) {
        seen.add(group)
        result.push(group)
      }
    }
  }

  return result
}

export function muscleGroupWeight(index: number): number {
  return index === 0 ? PRIMARY_MUSCLE_WEIGHT : SECONDARY_MUSCLE_WEIGHT
}

export function aggregateMuscleGroupRows(
  rows: Array<{ muscleGroupRaw: string; volume: number; sets: number }>,
): Array<{ muscleGroup: string; volume: number; sets: number }> {
  const byGroup = new Map<string, { volume: number; sets: number }>()

  for (const row of rows) {
    const groups = parseMuscleGroups(row.muscleGroupRaw)
    const targets = groups.length > 0 ? groups : (['другое'] as MuscleGroup[])

    for (let index = 0; index < targets.length; index += 1) {
      const group = targets[index]
      const weight = muscleGroupWeight(index)
      const current = byGroup.get(group) ?? { volume: 0, sets: 0 }
      current.volume += row.volume * weight
      current.sets += row.sets * weight
      byGroup.set(group, current)
    }
  }

  return [...byGroup.entries()]
    .map(([muscleGroup, stats]) => ({
      muscleGroup,
      volume: Math.round(stats.volume),
      sets: Math.round(stats.sets * 10) / 10,
    }))
    .sort((a, b) => b.volume - a.volume)
}
