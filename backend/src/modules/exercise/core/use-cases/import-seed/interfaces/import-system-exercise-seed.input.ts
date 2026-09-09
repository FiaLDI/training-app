export interface ImportSystemExerciseSeedInput {
  bytes: Buffer
}

export interface ImportSystemExerciseSeedSkipped {
  id: string
  name: string
  reason: 'id' | 'name'
}

export interface ImportSystemExerciseSeedOutput {
  created: number
  skipped: ImportSystemExerciseSeedSkipped[]
  imagesAttached: number
}
