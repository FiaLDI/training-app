'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useTemplateStore } from '@/entities/template/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { Button } from '@/shared/ui/button'
import { Select } from '@/shared/ui/select'

type Props = {
  templateId?: string
}

export function StartTrainingButton({ templateId }: Props) {
  const router = useRouter()
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)
  const create = useTrainingStore((s) => s.create)
  const [selectedId, setSelectedId] = useState(templateId ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ensureTemplates() {
    if (!templateId && templates.length === 0) {
      await fetchTemplates()
    }
  }

  async function start() {
    setLoading(true)
    setError(null)
    try {
      await ensureTemplates()
      const training = await create({
        templateId: selectedId || null,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      })
      router.push(`/trainings/${training.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось начать тренировку')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!templateId ? (
        <Select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          onFocus={() => void ensureTemplates()}
          className="min-w-48"
        >
          <option value="">Пустая сессия</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
      ) : null}
      <Button type="button" onClick={() => void start()} disabled={loading}>
        <Play className="size-4" />
        {loading ? 'Запуск…' : 'Начать тренировку'}
      </Button>
      {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
    </div>
  )
}
