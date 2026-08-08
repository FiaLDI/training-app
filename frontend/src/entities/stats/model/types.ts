export type VolumeStatPoint = {
  date: string
  volume: number
}

export type ExerciseProgressPoint = {
  date: string
  maxWeight: number | null
  bestVolume: number
}

export type VolumeStatsResult = {
  points: VolumeStatPoint[]
}

export type ExerciseProgressResult = {
  points: ExerciseProgressPoint[]
}
