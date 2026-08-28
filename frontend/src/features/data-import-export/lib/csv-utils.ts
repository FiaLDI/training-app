export type CsvRow = Record<string, string>

function detectDelimiter(line: string): ',' | ';' {
  const commas = (line.match(/,/g) ?? []).length
  const semicolons = (line.match(/;/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

function parseCsvLine(line: string, delimiter: ',' | ';'): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === delimiter) {
      fields.push(current)
      current = ''
      continue
    }

    current += char
  }

  fields.push(current)
  return fields
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/^"|"$/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const normalized = text.replace(/^\uFEFF/, '').trim()
  if (!normalized) {
    return { headers: [], rows: [] }
  }

  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const delimiter = detectDelimiter(lines[0]!)
  const rawHeaders = parseCsvLine(lines[0]!, delimiter)
  const headers = rawHeaders.map((header) => header.trim().replace(/^"|"$/g, ''))
  const headerKeys = rawHeaders.map(normalizeHeader)

  const rows: CsvRow[] = []
  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line, delimiter)
    if (values.every((value) => value.trim() === '')) continue

    const row: CsvRow = {}
    for (let i = 0; i < headerKeys.length; i += 1) {
      const key = headerKeys[i]
      if (!key) continue
      row[key] = (values[i] ?? '').trim().replace(/^"|"$/g, '')
    }
    rows.push(row)
  }

  return { headers, rows }
}

export function parseNumber(value: string | undefined): number | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-' || trimmed === '—') return null
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function parseInteger(value: string | undefined): number | null {
  const parsed = parseNumber(value)
  if (parsed == null) return null
  return Math.round(parsed)
}

export function rowValue(row: CsvRow, ...keys: string[]): string {
  for (const key of keys) {
    const normalized = normalizeHeader(key)
    const value = row[normalized]
    if (value != null && value !== '') return value
  }
  return ''
}
