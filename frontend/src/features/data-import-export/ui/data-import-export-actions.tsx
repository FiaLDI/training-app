'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Upload } from 'lucide-react'

import { useSessionStore } from '@/entities/session/model/store'
import { exportCsvFile } from '@/features/data-import-export/lib/export-csv'
import { exportJsonFile } from '@/features/data-import-export/lib/export-data'
import {
  formatImportResult,
  importDataFile,
} from '@/features/data-import-export/lib/import-data'
import { csvFormatLabel } from '@/features/data-import-export/lib/detect-csv-format'
import type { CsvImportFormat } from '@/features/data-import-export/lib/types'
import { Button } from '@/shared/ui/button'

export function DataImportExportActions() {
  const router = useRouter()
  const mode = useSessionStore((s) => s.mode)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || pending) return

    setPending(true)
    setError(null)
    setMessage(null)

    try {
      const result = await importDataFile(file, { cloudMode: mode === 'cloud' })
      const formatLabel =
        result.format === 'json' ? 'JSON' : csvFormatLabel(result.format as CsvImportFormat)
      setMessage(`${formatLabel}: ${formatImportResult(result)}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось импортировать файл')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          className="justify-start"
          disabled={pending}
          onClick={() => exportJsonFile()}
        >
          <Download className="size-4" />
          Экспорт JSON
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="justify-start"
          disabled={pending}
          onClick={() => exportCsvFile()}
        >
          <Download className="size-4" />
          Экспорт CSV
        </Button>
      </div>
      <p className="text-xs text-[var(--muted)]">
        JSON — свои тренировки и кастомные упражнения (без общего каталога). CSV — история
        подходов в формате, совместимом с Strong.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,text/csv,application/json"
        className="hidden"
        onChange={(event) => void onImportFile(event)}
      />
      <Button
        type="button"
        variant="secondary"
        className="w-full justify-start"
        disabled={pending}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="size-4" />
        {pending ? 'Импорт…' : 'Импорт из файла'}
      </Button>
      <p className="text-xs text-[var(--muted)]">
        JSON IronLog, а также CSV-экспорты Strong, Hevy и FitNotes. Дубликаты тренировок по
        дате и упражнений по id/названию пропускаются. Общий каталог не импортируется.
      </p>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  )
}
