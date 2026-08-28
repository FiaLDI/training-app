import type { MuscleGroup } from '@/entities/exercise/model/muscle-groups'
import { MUSCLE_GROUPS } from '@/entities/exercise/model/muscle-groups'
import type { MuscleGroupStatPoint } from '@/entities/stats/model/types'

const MUSCLE_GROUP_SET = new Set<string>(MUSCLE_GROUPS)

export function muscleStatsToDiagram(groups: MuscleGroupStatPoint[]): {
  groups: MuscleGroup[]
  intensityByGroup: Partial<Record<MuscleGroup, number>>
} {
  const withVolume = groups.filter((g) => g.volume > 0)
  const maxVolume = Math.max(...withVolume.map((g) => g.volume), 1)

  const highlighted: MuscleGroup[] = []
  const intensityByGroup: Partial<Record<MuscleGroup, number>> = {}

  for (const item of withVolume) {
    if (!MUSCLE_GROUP_SET.has(item.muscleGroup)) continue
    const group = item.muscleGroup as MuscleGroup
    if (group === 'другое') continue
    highlighted.push(group)
    intensityByGroup[group] = item.volume / maxVolume
  }

  return { groups: highlighted, intensityByGroup }
}
