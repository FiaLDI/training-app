export type StatsPeriod = 'week' | 'month' | 'year'

export function statsPeriodRange(period: StatsPeriod): { from: string; to: string } {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date()
  from.setHours(0, 0, 0, 0)

  if (period === 'week') {
    from.setDate(from.getDate() - 6)
  } else if (period === 'month') {
    from.setDate(from.getDate() - 27)
  } else {
    from.setFullYear(from.getFullYear() - 1)
    from.setDate(from.getDate() + 1)
  }

  return { from: from.toISOString(), to: to.toISOString() }
}

export const STATS_PERIOD_LABELS: Record<StatsPeriod, string> = {
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
}
