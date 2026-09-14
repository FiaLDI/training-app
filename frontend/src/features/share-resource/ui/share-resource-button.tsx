'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, QrCode as QrIcon, Share2 } from 'lucide-react'

import { shareApi } from '@/entities/share/api/share-api'
import { publicShareUrl } from '@/entities/share/lib/share-url'
import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { QrCode } from '@/shared/ui/qr-code'

type Props = {
  resourceType: 'template' | 'program'
  resourceId: string
  label?: string
}

export function ShareResourceButton({ resourceType, resourceId, label = 'Поделиться' }: Props) {
  const mode = useSessionStore((s) => s.mode)
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || mode !== 'cloud') return
    let cancelled = false
    setBusy(true)
    setError(null)
    const create =
      resourceType === 'template'
        ? shareApi.createTemplate(resourceId)
        : shareApi.createProgram(resourceId)
    void create
      .then((link) => {
        if (!cancelled) setToken(link.token)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось создать ссылку')
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, mode, resourceType, resourceId])

  if (mode !== 'cloud') return null

  const url = token ? publicShareUrl(token) : ''

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Не удалось скопировать')
    }
  }

  async function revoke() {
    if (!token) return
    setBusy(true)
    try {
      await shareApi.revoke(token)
      setToken(null)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отозвать ссылку')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="secondary" type="button" onClick={() => setOpen(true)}>
        <Share2 className="size-4" />
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Публичная ссылка"
        description="Любой, у кого есть ссылка или QR, увидит состав и сможет скопировать к себе."
        footer={
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
        }
      >
        {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}
        {busy && !token ? (
          <p className="text-sm text-[var(--muted)]">Готовим ссылку…</p>
        ) : token ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <QrCode value={url} />
            </div>
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="Ссылка" />
              <Button variant="secondary" type="button" onClick={() => void copy()}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <Button variant="danger" type="button" disabled={busy} onClick={() => void revoke()}>
              Отозвать ссылку
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Ссылка не создана.</p>
        )}
        <p className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
          <QrIcon className="size-3.5" />
          Откройте камерой телефона — попадёте на страницу программы.
        </p>
      </Modal>
    </>
  )
}
