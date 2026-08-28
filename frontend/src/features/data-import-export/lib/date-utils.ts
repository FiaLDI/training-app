export function parseWorkoutDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const iso = Date.parse(trimmed)
  if (!Number.isNaN(iso)) {
    return new Date(iso).toISOString()
  }

  const strongMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  )
  if (strongMatch) {
    const [, year, month, day, hour = '12', minute = '00', second = '00'] = strongMatch
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ).toISOString()
  }

  const hevyMatch = trimmed.match(
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})$/,
  )
  if (hevyMatch) {
    const [, day, monthName, year, hour, minute] = hevyMatch
    const monthIndex = new Date(`${monthName} 1, 2000`).getMonth()
    if (!Number.isNaN(monthIndex)) {
      return new Date(
        Number(year),
        monthIndex,
        Number(day),
        Number(hour),
        Number(minute),
      ).toISOString()
    }
  }

  return null
}

export function dateOnly(iso: string): string {
  return iso.slice(0, 10)
}
