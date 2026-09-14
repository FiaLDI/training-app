export const DAY_OF_WEEK_FULL = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]

export function dayOfWeekLabel(dayOfWeek: number): string {
  return DAY_OF_WEEK_FULL[dayOfWeek - 1] ?? `День ${dayOfWeek}`
}
