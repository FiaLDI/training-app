'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { shareApi } from '@/entities/share/api/share-api'
import type { PublicShare } from '@/entities/share/model/types'
import { SharedResourcePreview } from '@/entities/share/ui/shared-resource-preview'
import { useProgramStore } from '@/entities/program/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { DetailSkeleton } from '@/shared/ui/skeleton'

type Props = {
  token: string
}

export function SharePage({ token }: Props) {
  const router = useRouter()
  const mode = useSessionStore((s) => s.mode)
  const fetchPrograms = useProgramStore((s) => s.fetchList)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)
  const [data, setData] = useState<PublicShare | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void shareApi
      .getPublic(token)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Ссылка недействительна')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function importShare() {
    setImporting(true)
    setImportError(null)
    try {
      const result = await shareApi.importShare(token)
      await Promise.all([fetchPrograms(), fetchTemplates()])
      if (result.programId) router.push(`/week?program=${result.programId}`)
      else if (result.templateId) router.push(`/plans/${result.templateId}`)
      else router.push('/plans')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Не удалось скопировать')
    } finally {
      setImporting(false)
    }
  }

  if (loading && !data) return <DetailSkeleton />
  if (error || !data) {
    return <EmptyState>{error ?? 'Ссылка недействительна'}</EmptyState>
  }

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 py-8">
      {mode ? (
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          В IronLog
        </Link>
      ) : null}
      <PageHeader
        title={data.resource.name}
        description={
          <span>
            Поделился {data.ownerUsername}
            {data.resource.description ? ` · ${data.resource.description}` : ''}
          </span>
        }
        action={
          mode === 'cloud' ? (
            <Button type="button" disabled={importing} onClick={() => void importShare()}>
              {importing ? 'Копируем…' : 'Добавить себе'}
            </Button>
          ) : (
            <Link href="/login">
              <Button type="button">Войти, чтобы добавить</Button>
            </Link>
          )
        }
      />
      {importError ? <p className="mb-4 text-sm text-red-300">{importError}</p> : null}
      <SharedResourcePreview resource={data.resource} />
    </div>
  )
}
