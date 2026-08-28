export function formatTimecodeSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function parseTimecodeInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  const match = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (!match) return null

  const minutes = Number(match[1])
  const seconds = Number(match[2])
  if (seconds >= 60) return null
  return minutes * 60 + seconds
}
