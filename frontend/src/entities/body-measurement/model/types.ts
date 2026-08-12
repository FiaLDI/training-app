export type BodyMeasurement = {
  id: string
  weight: number
  measuredAt: string
  metadata: Record<string, unknown>
}

export type CreateBodyMeasurementInput = {
  id?: string
  weight: number
  measuredAt?: string
  metadata?: Record<string, unknown>
}

export type ListBodyMeasurementsResult = {
  items: BodyMeasurement[]
}
