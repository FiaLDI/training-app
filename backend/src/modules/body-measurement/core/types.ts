export type BodyMeasurement = {
  id: string
  userId: string
  weight: number | null
  measuredAt: string
  metadata: Record<string, unknown>
}
