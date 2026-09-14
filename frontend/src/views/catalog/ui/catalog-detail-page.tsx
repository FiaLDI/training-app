'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BadgeCheck } from 'lucide-react'

import { catalogApi } from '@/entities/catalog/api/catalog-api'
import type { CatalogProgramDetail } from '@/entities/catalog/model/types'
import { useProgramStore } from '@/entities/program/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { useSessionStore } from '@/entities/session/model/store'
import { ProgramSnapshotPreview } from '@/entities/share/ui/shared-resource-preview'
import { CloudRequired } from '@/shared/ui/cloud-required'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { DetailSkeleton } from '@/shared/ui/skeleton'

type Props = {
  slug: string
}

export function CatalogDetailPage({ slug }: Props) {
  const router = useRouter()
  const mode = useSessionStore((s) => s.mode)
  const fetchPrograms = useProgramStore((s) => s.fetchList)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)
  const [item, setItem] = useState<CatalogProgramDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void catalogApi
      .getBySlug(slug)
      .then((result) => {
        if (!cancelled) setItem(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Программа не найдена')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  async function install() {
    if (!item) return
    setInstalling(true)
    setInstallError(null)
    try {
      const result = await catalogApi.install(item.slug)
      setSkipped(result.skippedExercises)
      await Promise.all([fetchPrograms(), fetchTemplates()])
      if (result.programId) {
        router.push(`/week?program=${result.programId}`)
      }
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : 'Не удалось добавить программу')
    } finally {
      setInstalling(false)
    }
  }

  if (loading && !item) return <DetailSkeleton />
  if (error || !item) {
    return <p className="text-sm text-red-300">{error ?? 'Программа не найдена'}</p>
  }

  return (
    <div>
      <Link
        href="/catalog"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Каталог
      </Link>
      <PageHeader
        title={item.name}
        description={
          <span>
            {item.author}
            {item.verified ? (
              <span className="ml-2 inline-flex items-center gap-1 text-[var(--accent)]">
                <BadgeCheck className="size-4" />
                Проверена
              </span>
            ) : null}
          </span>
        }
        action={
          mode === 'cloud' ? (
            <Button type="button" disabled={installing} onClick={() => void install()}>
              {installing ? 'Ставим на неделю…' : 'Поставить на эту неделю'}
            </Button>
          ) : undefined
        }
      />
      <p className="mb-6 max-w-2xl text-sm text-[var(--muted)]">{item.description}</p>
      {installError ? <p className="mb-4 text-sm text-red-300">{installError}</p> : null}
      {skipped.length > 0 ? (
        <p className="mb-4 text-sm text-amber-300">
          Не найдены упражнения: {skipped.join(', ')}
        </p>
      ) : null}
      {mode !== 'cloud' ? (
        <div className="mb-6">
          <CloudRequired action="Чтобы поставить программу на текущую неделю, войдите в облако." />
        </div>
      ) : null}
      <ProgramSnapshotPreview snapshot={item.snapshot} />
    </div>
  )
}
