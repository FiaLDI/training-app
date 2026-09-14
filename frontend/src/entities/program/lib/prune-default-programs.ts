export const DEFAULT_PROGRAM_NAME = 'Моя неделя'

export type ProgramListHint = {
  id: string
  name: string
  createdAt: string
  dayCount?: number
  isSystem?: boolean
}

/** Extra auto-created «Моя неделя» copies to drop. Keeps one: newest with days, else oldest. */
export function extraDefaultProgramIds(programs: ProgramListHint[]): string[] {
  const defaults = programs
    .filter((program) => program.name === DEFAULT_PROGRAM_NAME && !program.isSystem)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (defaults.length <= 1) return []

  const withDays = defaults.filter((program) => (program.dayCount ?? 0) > 0)
  const keepId = withDays[0]?.id ?? defaults[defaults.length - 1].id
  return defaults.filter((program) => program.id !== keepId).map((program) => program.id)
}
