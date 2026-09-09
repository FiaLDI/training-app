'use client'

import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'

import { Button } from '@/shared/ui/button'

import {
  downloadSystemExerciseSeed,
  formatSeedImportResult,
  importSystemExerciseSeed,
} from '../model/manage-system-catalog'

export function AdminSystemCatalogPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onDownload() {
    if (pending) return
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      await downloadSystemExerciseSeed()
      setMessage('Архив скачан')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось скачать архив')
    } finally {
      setPending(false)
    }
  }

  async function onImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || pending) return
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      const result = await importSystemExerciseSeed(file)
      setMessage(formatSeedImportResult(result))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось импортировать архив')
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
          onClick={() => void onDownload()}
        >
          <Download className="size-4" />
          Скачать архив
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="justify-start"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          {pending ? 'Импорт…' : 'Импортировать zip'}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(event) => void onImport(event)}
      />
      <p className="text-xs text-[var(--muted)]">
        В архиве системные упражнения и главное изображение каждого. Дубли по id и названию
        пропускаются.
      </p>
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  )
}
