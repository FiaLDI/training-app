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
  const addExercise = useTrainingStore((s) => s.addExercise)
  const fetchTemplate = useTemplateStore((s) => s.fetchOne)
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

      if (selectedId) {
        await fetchTemplate(selectedId)
        const template = useTemplateStore.getState().current
        if (template) {
          for (const item of template.exercises) {
            await addExercise(training.id, {
              exerciseId: item.exerciseId,
              exerciseOrder: item.exerciseOrder,
              targetSets: item.targetSets,
              minReps: item.minReps,
              maxReps: item.maxReps,
              restSeconds: item.restSeconds,
              notes: item.notes,
              metadata:
                item.targetWeight != null ? { targetWeight: item.targetWeight } : undefined,
            })
          }
        }
      }

      router.push(`/trainings/${training.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training')
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
          <option value="">Empty session</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
      ) : null}
      <Button type="button" onClick={() => void start()} disabled={loading}>
        <Play className="size-4" />
        {loading ? 'Starting…' : 'Start training'}
      </Button>
      {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
    </div>
  )
}
