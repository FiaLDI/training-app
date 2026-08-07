export type Equipment = {
  id: string
  name: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type CreateEquipmentInput = {
  name: string
}

export type ListEquipmentResult = {
  items: Equipment[]
  total: number
  page: number
  limit: number
}

export function serializeEquipmentNames(names: string[]): string | null {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
  if (unique.length === 0) return null
  return unique.join(',')
}

export function parseEquipmentNames(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
