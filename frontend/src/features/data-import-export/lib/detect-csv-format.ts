import { parseCsv } from './csv-utils'
import { parseFitNotesCsv } from './parsers/fitnotes-csv'
import { parseHevyCsv } from './parsers/hevy-csv'
import { parseStrongCsv } from './parsers/strong-csv'
import type { CsvImportFormat } from './types'

function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/^"|"$/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectCsvFormat(text: string): CsvImportFormat | null {
  const { headers } = parseCsv(text)
  if (headers.length === 0) return null

  const normalized = headers.map(normalizeHeader)

  if (normalized.includes('exercise_title') && normalized.includes('start_time')) {
    return 'hevy'
  }

  if (
    normalized.includes('exercise') &&
    (normalized.includes('weight (kg)') || normalized.includes('weight (lbs)'))
  ) {
    return 'fitnotes'
  }

  if (
    normalized.includes('exercise name') &&
    (normalized.includes('set order') || normalized.includes('workout name'))
  ) {
    return 'strong'
  }

  if (normalized.includes('date') && normalized.includes('workout name')) {
    return 'strong'
  }

  return null
}

export function parseCsvByFormat(text: string, format: CsvImportFormat) {
  switch (format) {
    case 'strong':
      return parseStrongCsv(text)
    case 'hevy':
      return parseHevyCsv(text)
    case 'fitnotes':
      return parseFitNotesCsv(text)
    default:
      return []
  }
}

export function csvFormatLabel(format: CsvImportFormat): string {
  switch (format) {
    case 'strong':
      return 'Strong'
    case 'hevy':
      return 'Hevy'
    case 'fitnotes':
      return 'FitNotes'
    default:
      return format
  }
}
