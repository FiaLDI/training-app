import type { TrainingSet } from '@/entities/training/model/types'

const DROP_GROUP_ID = 'dropGroupId'
const DROP_INDEX = 'dropIndex'

export function isDropSet(metadata: Record<string, unknown> | undefined): boolean {
  return typeof metadata?.[DROP_GROUP_ID] === 'string'
}

export function getDropGroupId(metadata: Record<string, unknown> | undefined): string | null {
  const value = metadata?.[DROP_GROUP_ID]
  return typeof value === 'string' ? value : null
}

export function getDropIndex(metadata: Record<string, unknown> | undefined): number {
  const value = metadata?.[DROP_INDEX]
  return typeof value === 'number' ? value : 0
}

export function buildDropSetMetadata(
  dropGroupId: string,
  dropIndex: number,
): Record<string, unknown> {
  return { [DROP_GROUP_ID]: dropGroupId, [DROP_INDEX]: dropIndex }
}

/** Last logged set for drop chaining (working or drop). */
export function lastLoggableSet(sets: TrainingSet[]): TrainingSet | null {
  const completed = sets.filter((set) => set.completed)
  return completed.length > 0 ? completed[completed.length - 1] : null
}

export function nextDropMetadata(lastSet: TrainingSet | null): Record<string, unknown> | null {
  if (!lastSet || lastSet.isWarmup) return null
  const existingGroupId = getDropGroupId(lastSet.metadata)
  const dropGroupId = existingGroupId ?? crypto.randomUUID()
  const dropIndex = existingGroupId ? getDropIndex(lastSet.metadata) + 1 : 1
  return buildDropSetMetadata(dropGroupId, dropIndex)
}

export function suggestDropWeight(
  lastWeight: number | null | undefined,
  weightStep: number,
): string {
  if (lastWeight == null || lastWeight <= 0) return ''
  return String(Math.max(0, lastWeight - weightStep))
}
