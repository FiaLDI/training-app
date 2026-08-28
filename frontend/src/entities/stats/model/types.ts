export type VolumeStatPoint = {
  date: string
  volume: number
}

export type ExerciseProgressPoint = {
  date: string
  maxWeight: number | null
  bestVolume: number
}

export type MuscleGroupStatPoint = {
  muscleGroup: string
  volume: number
  sets: number
}

export type ActivityStatPoint = {
  date: string
  sessionCount: number
  volume: number
}

export type StrengthCorrelationPoint = {
  date: string
  bodyWeight: number | null
  maxWeight: number | null
  volume: number
}

export type VolumeStatsResult = {
  points: VolumeStatPoint[]
}

export type ExerciseProgressResult = {
  points: ExerciseProgressPoint[]
}

export type MuscleGroupStatsResult = {
  groups: MuscleGroupStatPoint[]
}

export type ActivityStatsResult = {
  points: ActivityStatPoint[]
}

export type StrengthCorrelationResult = {
  points: StrengthCorrelationPoint[]
}
