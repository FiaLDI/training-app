import { csvFormatLabel, detectCsvFormat, parseCsvByFormat } from './detect-csv-format'
import { importJsonBundle, importParsedWorkouts } from './import-workouts'
import type { CsvImportFormat, ImportResult } from './types'

export async function importDataFile(
  file: File,
  options: { cloudMode: boolean },
): Promise<ImportResult> {
  const text = await file.text()
  const trimmed = text.trim()

  if (!trimmed) {
    throw new Error('Файл пуст')
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new Error('Не удалось разобрать JSON')
    }
    return importJsonBundle(parsed, options)
  }

  const format = detectCsvFormat(trimmed)
  if (!format) {
    throw new Error(
      'Неизвестный формат CSV. Поддерживаются экспорты Strong, Hevy и FitNotes.',
    )
  }

  const workouts = parseCsvByFormat(trimmed, format)
  if (workouts.length === 0) {
    throw new Error(`Файл ${csvFormatLabel(format)} не содержит тренировок`)
  }

  const result = importParsedWorkouts(workouts, {
    cloudMode: options.cloudMode,
    skipDuplicates: true,
  })

  return {
    ...result,
    format,
  }
}

export function formatImportResult(result: ImportResult): string {
  const parts = [
    `Импортировано тренировок: ${result.workoutsImported}`,
    `пропущено: ${result.workoutsSkipped}`,
    `подходов: ${result.setsImported}`,
  ]
  if (result.exercisesCreated > 0) {
    parts.push(`новых упражнений: ${result.exercisesCreated}`)
  }
  return parts.join(', ')
}

export type { CsvImportFormat, ImportResult }
