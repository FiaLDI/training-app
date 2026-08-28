export type ActivityDay = {
  date: string
  dayOfMonth: number
  trained: boolean
  /** Not part of this calendar month. */
  outsideMonth: boolean
  isFuture: boolean
  isToday: boolean
}

export type ActivityMonth = {
  key: string
  label: string
  weeks: ActivityDay[][]
  isCurrent: boolean
}

/** Local YYYY-MM-DD */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Monday = start of week */
function startOfWeekMonday(date: Date): Date {
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  return addDays(startOfDay(date), offset)
}

export function trainedDates(dates: string[]): Set<string> {
  const set = new Set<string>()
  for (const iso of dates) {
    set.add(toDateKey(new Date(iso)))
  }
  return set
}

function buildMonthWeeks(
  year: number,
  month: number,
  trained: Set<string>,
  todayKey: string,
): ActivityDay[][] {
  const first = new Date(year, month, 1)
  const start = startOfWeekMonday(first)
  const last = new Date(year, month + 1, 0)
  const end = startOfWeekMonday(last)

  const weeks: ActivityDay[][] = []
  let cursor = start

  while (cursor <= end) {
    const week: ActivityDay[] = []
    for (let i = 0; i < 7; i += 1) {
      const day = addDays(cursor, i)
      const key = toDateKey(day)
      const outsideMonth = day.getMonth() !== month
      week.push({
        date: key,
        dayOfMonth: day.getDate(),
        trained: !outsideMonth && trained.has(key),
        outsideMonth,
        isFuture: key > todayKey,
        isToday: key === todayKey,
      })
    }
    weeks.push(week)
    cursor = addDays(cursor, 7)
  }

  return weeks
}

/**
 * One calendar-month grid per month, centered on today (±`months`).
 */
export function buildActivityMonths(
  dates: string[],
  today = new Date(),
  months = 2,
): {
  months: ActivityMonth[]
  total: number
  todayKey: string
} {
  const trained = trainedDates(dates)
  const todayStart = startOfDay(today)
  const todayKey = toDateKey(todayStart)

  const centerYear = todayStart.getFullYear()
  const centerMonth = todayStart.getMonth()
  const rangeStart = new Date(centerYear, centerMonth - months, 1)
  const rangeEnd = new Date(centerYear, centerMonth + months + 1, 0)
  const rangeStartKey = toDateKey(rangeStart)
  const rangeEndKey = toDateKey(rangeEnd)

  const result: ActivityMonth[] = []
  for (let offset = -months; offset <= months; offset += 1) {
    const date = new Date(centerYear, centerMonth + offset, 1)
    const year = date.getFullYear()
    const month = date.getMonth()
    result.push({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: date.toLocaleString('ru-RU', { month: 'short' }),
      weeks: buildMonthWeeks(year, month, trained, todayKey),
      isCurrent: offset === 0,
    })
  }

  let total = 0
  for (const key of trained) {
    if (key >= rangeStartKey && key <= todayKey && key <= rangeEndKey) {
      total += 1
    }
  }

  return { months: result, total, todayKey }
}

export type HeatmapDay = {
  date: string
  volume: number
  sessionCount: number
  level: 0 | 1 | 2 | 3 | 4
  isFuture: boolean
  isToday: boolean
}

function volumeLevel(volume: number, maxVolume: number): 0 | 1 | 2 | 3 | 4 {
  if (volume <= 0) return 0
  if (maxVolume <= 0) return 1
  const ratio = volume / maxVolume
  if (ratio >= 0.75) return 4
  if (ratio >= 0.5) return 3
  if (ratio >= 0.25) return 2
  return 1
}

/** GitHub-style grid: last 52 weeks ending today. */
export function buildYearHeatmap(
  points: Array<{ date: string; volume: number; sessionCount: number }>,
  today = new Date(),
): { weeks: HeatmapDay[][]; total: number; maxVolume: number; todayKey: string } {
  const byDate = new Map(points.map((p) => [p.date, p]))
  const todayStart = startOfDay(today)
  const todayKey = toDateKey(todayStart)
  const end = todayStart
  const start = addDays(end, -(52 * 7 - 1))
  const gridStart = startOfWeekMonday(start)

  let maxVolume = 0
  let total = 0
  const weeks: HeatmapDay[][] = []
  let cursor = gridStart

  while (cursor <= end) {
    const week: HeatmapDay[] = []
    for (let i = 0; i < 7; i += 1) {
      const day = addDays(cursor, i)
      const key = toDateKey(day)
      const point = byDate.get(key)
      const volume = point?.volume ?? 0
      const sessionCount = point?.sessionCount ?? 0
      if (key <= todayKey && sessionCount > 0) {
        maxVolume = Math.max(maxVolume, volume)
        total += 1
      }
      week.push({
        date: key,
        volume,
        sessionCount,
        level: key > todayKey ? 0 : volumeLevel(volume, 0),
        isFuture: key > todayKey,
        isToday: key === todayKey,
      })
    }
    weeks.push(week)
    cursor = addDays(cursor, 7)
  }

  for (const week of weeks) {
    for (const day of week) {
      if (!day.isFuture) {
        day.level = volumeLevel(day.volume, maxVolume)
      }
    }
  }

  return { weeks, total, maxVolume, todayKey }
}
