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

/** Старые грубые ярлыки → детальные группы (данные в БД могли сохраниться так). */
const LEGACY_MUSCLE_GROUP_EXPAND: Record<string, readonly MuscleGroup[]> = {
  руки: ['бицепс', 'трицепс', 'предплечья'],
  плечи: ['передние дельты', 'средние дельты', 'задние дельты'],
  ноги: ['квадрицепс', 'бицепс бедра', 'ягодицы', 'икры'],
  спина: ['трапеции', 'широчайшие', 'середина спины', 'поясница'],
}

const MUSCLE_GROUP_SET = new Set<string>(MUSCLE_GROUPS)

export function serializeMuscleGroups(groups: MuscleGroup[]): string | null {
  if (groups.length === 0) return null
  return [...new Set(groups)].join(',')
}

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
