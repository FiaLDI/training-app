import { addDaysKey, dayOfWeekFromDateKey } from './week-window'

const ACTIVE_STATUSES = new Set(['planned', 'in_progress', 'finished'])
const STATUS_RANK: Record<string, number> = {
  in_progress: 3,
  planned: 2,
  finished: 1,
}

export type WeekTrainingSlot = {
  status: string
  templateId: string | null
  scheduledAt: string | null
  startedAt?: string | null
}

export function templateIdsForWeek(
  weekStart: string,
  trainings: WeekTrainingSlot[],
): Map<number, string> {
  const sunday = addDaysKey(weekStart, 6)
  const best = new Map<number, { rank: number; templateId: string }>()

  for (const training of trainings) {
    if (!ACTIVE_STATUSES.has(training.status) || !training.templateId) continue
    const when = training.scheduledAt ?? training.startedAt
    if (!when) continue
    const key = when.slice(0, 10)
    if (key < weekStart || key > sunday) continue
    const dayOfWeek = dayOfWeekFromDateKey(key)
    if (!dayOfWeek) continue
    const rank = STATUS_RANK[training.status] ?? 0
    const current = best.get(dayOfWeek)
    if (!current || rank > current.rank) {
      best.set(dayOfWeek, { rank, templateId: training.templateId })
    }
  }

  return new Map([...best.entries()].map(([day, slot]) => [day, slot.templateId]))
}
