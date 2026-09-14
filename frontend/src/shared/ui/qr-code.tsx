'use client'

import { useEffect, useState } from 'react'

type Props = {
  value: string
  size?: number
}

export function QrCode({ value, size = 192 }: Props) {
  const [svg, setSvg] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    setSvg(null)
    void import('qrcode')
      .then((mod) => {
        const QRCode = typeof mod.toString === 'function' ? mod : mod.default
        return QRCode.toString(value, {
          type: 'svg',
          margin: 1,
          width: size,
          color: { dark: '#e8f0ea', light: '#121a18' },
        })
      })
      .then((markup) => {
        if (!cancelled) setSvg(markup)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [size, value])

  if (failed) {
    return (
      <p className="text-sm text-[var(--muted)]">QR-код не собран — скопируйте ссылку вручную.</p>
    )
  }

  if (!svg) {
    return (
      <div
        className="rounded-xl bg-[var(--surface-2)]"
        style={{ width: size, height: size }}
        aria-hidden
      />
    )
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
