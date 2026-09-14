'use client'

import { FormEvent, useMemo, useState } from 'react'

import { coachApi } from '@/entities/coach/api/coach-api'
import type { SetComment } from '@/entities/coach/model/types'
import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'

type Props = {
  setId: string
  comments: SetComment[]
  canComment?: boolean
  onCommented?: (comment: SetComment) => void
}

export function SetComments({ setId, comments, canComment = false, onCommented }: Props) {
  const user = useSessionStore((s) => s.user)
  const mine = useMemo(
    () => comments.filter((item) => item.setId === setId),
    [comments, setId],
  )
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    setError(null)
    try {
      const comment = await coachApi.addComment(setId, body.trim())
      onCommented?.(comment)
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить')
    } finally {
      setBusy(false)
    }
  }

  if (mine.length === 0 && !canComment) return null

  return (
    <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      {mine.map((item) => (
        <p key={item.id} className="text-sm">
          <span className="text-[var(--muted)]">
            {item.authorId === user?.id ? 'Вы' : item.authorUsername}:{' '}
          </span>
          {item.body}
        </p>
      ))}
      {canComment ? (
        <form onSubmit={onSubmit} className="space-y-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Комментарий к подходу"
            rows={2}
            className="min-h-16"
          />
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
          <Button type="submit" variant="secondary" disabled={busy || !body.trim()}>
            Отправить
          </Button>
        </form>
      ) : null}
    </div>
  )
}
