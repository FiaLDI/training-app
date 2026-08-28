'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Link2Off } from 'lucide-react'

import type { TemplateExercise, TemplateExerciseGroup } from '@/entities/template/model/types'
import {
  groupRestLabel,
  groupTypeLabel,
  isLastInGroup,
  resolveLinkWithBelowAction,
} from '@/entities/session/lib/exercise-group-utils'
import { useTemplateStore } from '@/entities/template/model/store'
import { EditTemplateExerciseRow } from '@/features/edit-template-exercise/ui/edit-template-exercise-row'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Props = {
  templateId: string
  group: TemplateExerciseGroup
  exercises: TemplateExercise[]
  exerciseName: (exerciseId: string) => string
  allExercises: TemplateExercise[]
}

export function TemplateExerciseGroupCard({
  templateId,
  group,
  exercises,
  exerciseName,
  allExercises,
}: Props) {
  const deleteGroup = useTemplateStore((s) => s.deleteGroup)
  const updateGroup = useTemplateStore((s) => s.updateGroup)
  const [restSeconds, setRestSeconds] = useState(
    group.restSeconds == null ? '' : String(group.restSeconds),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setRestSeconds(group.restSeconds == null ? '' : String(group.restSeconds))
  }, [group.restSeconds])

  async function onSaveRest(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await updateGroup(templateId, group.id, {
        restSeconds: restSeconds === '' ? null : Number(restSeconds),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="rounded-xl border border-[var(--accent)]/30 bg-[var(--surface)] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--accent)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">
          {groupTypeLabel(group.type)}
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void deleteGroup(templateId, group.id)}
        >
          <Link2Off className="size-4" />
          Разъединить
        </Button>
      </div>

      <ul className="space-y-2">
        {exercises.map((item) => {
          const globalIndex = allExercises.findIndex((row) => row.id === item.id)
          const above = allExercises[globalIndex - 1]
          const below = allExercises[globalIndex + 1]
          const linkAction = resolveLinkWithBelowAction(item, below, allExercises)
          const canLinkWithBelow = linkAction != null
          const hideLinkWithBelow =
            Boolean(item.groupId) && !isLastInGroup(item, allExercises)

          return (
            <EditTemplateExerciseRow
              key={item.id}
              templateId={templateId}
              item={item}
              exerciseName={exerciseName(item.exerciseId)}
              displayIndex={globalIndex + 1}
              canMoveUp={globalIndex > 0}
              canMoveDown={globalIndex < allExercises.length - 1}
              neighborAboveId={above?.id}
              neighborAboveOrder={above?.exerciseOrder}
              neighborBelowId={below?.id}
              neighborBelowOrder={below?.exerciseOrder}
              canLinkWithBelow={canLinkWithBelow}
              hideLinkWithBelow={hideLinkWithBelow}
              linkAction={linkAction}
            />
          )
        })}
      </ul>

      <form onSubmit={onSaveRest} className="mt-3 flex items-end gap-2">
        <label className="space-y-1 text-xs text-[var(--muted)]">
          {groupRestLabel(group.type)}
          <Input
            type="number"
            min="0"
            value={restSeconds}
            onChange={(event) => setRestSeconds(event.target.value)}
            className="w-24"
          />
        </label>
        <Button type="submit" variant="secondary" disabled={saving}>
          Сохранить
        </Button>
      </form>
    </li>
  )
}
