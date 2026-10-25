export type TrainingListCounts = {
  setCount: number
  exerciseCount: number
}

export type TrainingListCountRow = {
  trainingId: string
  setCount: string | number
  exerciseCount: string | number
}

export function countsByTrainingId(rows: TrainingListCountRow[]): Map<string, TrainingListCounts> {
  const map = new Map<string, TrainingListCounts>()
  for (const row of rows) {
    map.set(String(row.trainingId), {
      setCount: Number(row.setCount) || 0,
      exerciseCount: Number(row.exerciseCount) || 0,
    })
  }
  return map
}
