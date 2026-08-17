'use client'

import {
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'

import { X } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

type Props = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
  closeDisabled?: boolean
  variant?: 'dialog' | 'sheet'
  showClose?: boolean
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const subscribe = () => () => {}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  closeDisabled = false,
  variant = 'dialog',
  showClose,
}: Props) {
  const isSheet = variant === 'sheet'
  const closeButtonVisible = showClose ?? isSheet
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return

    const previousActiveElement = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(focusableSelector)
      ;(firstFocusable ?? panelRef.current)?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      previousActiveElement?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open || closeDisabled) return

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [closeDisabled, onClose, open])

  if (!mounted || !open) return null

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (!closeDisabled && event.target === event.currentTarget) onClose()
  }

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return

    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    )
    if (focusable.length === 0) {
      event.preventDefault()
      panelRef.current?.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center bg-black/60',
        isSheet
          ? 'items-end p-0 sm:items-center sm:p-4'
          : 'items-end p-4 sm:items-center',
      )}
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className={cn(
          'w-full border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl outline-none',
          isSheet
            ? 'flex h-[min(85vh,720px)] max-h-[85vh] max-w-lg flex-col overflow-hidden rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl'
            : 'max-h-[90vh] max-w-md overflow-y-auto rounded-2xl',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id={titleId}
            className="font-[family-name:var(--font-display)] text-xl text-[var(--foreground)]"
          >
            {title}
          </h2>
          {closeButtonVisible ? (
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Закрыть"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              <X className="size-5" />
            </button>
          ) : null}
        </div>
        {description ? (
          <div id={descriptionId} className="mt-2 text-sm text-[var(--muted)]">
            {description}
          </div>
        ) : null}
        {children ? (
          <div
            className={cn(
              'mt-4',
              isSheet && 'flex min-h-0 flex-1 flex-col overflow-hidden',
              contentClassName,
            )}
          >
            {children}
          </div>
        ) : null}
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
