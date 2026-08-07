export const MUSCLE_GROUPS = [
  'руки',
  'спина',
  'плечи',
  'ноги',
  'пресс',
  'грудь',
  'другое',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export function serializeMuscleGroups(groups: MuscleGroup[]): string | null {
  if (groups.length === 0) return null
  return groups.join(',')
}

export function parseMuscleGroups(value: string | null | undefined): MuscleGroup[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is MuscleGroup =>
      (MUSCLE_GROUPS as readonly string[]).includes(item),
    )
}
