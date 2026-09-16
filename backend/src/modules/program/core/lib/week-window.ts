function dateKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function currentMondayKey(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))
  const day = date.getUTCDay()
  const offset = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + offset)
  return dateKeyUtc(date)
}

export function dayOfWeekFromDateKey(dateKey: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const date = new Date(`${dateKey}T12:00:00.000Z`)
  const utcDay = date.getUTCDay()
  return utcDay === 0 ? 7 : utcDay
}

export function addDaysKey(weekStart: string, days: number): string {
  const date = new Date(`${weekStart}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return dateKeyUtc(date)
}

export function scheduledAtForDay(weekStart: string, dayOfWeek: number): string {
  return `${addDaysKey(weekStart, dayOfWeek - 1)}T12:00:00.000Z`
}

export function weekRangeIso(weekStart: string): { from: string; to: string } {
  return {
    from: `${weekStart}T00:00:00.000Z`,
    to: `${addDaysKey(weekStart, 6)}T23:59:59.999Z`,
  }
}

/** Current week with a 1-day slack on Monday for UTC vs local timezone. */
export function isApplyWeekAllowed(weekStart: string, now = new Date()): boolean {
  const today = dateKeyUtc(now)
  const earliest = addDaysKey(weekStart, -1)
  const sunday = addDaysKey(weekStart, 6)
  return today >= earliest && today <= sunday
}
