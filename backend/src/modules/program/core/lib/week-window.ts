function dateKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
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
