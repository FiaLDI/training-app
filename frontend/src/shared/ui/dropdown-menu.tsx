'use client'

import { ReactNode, useEffect, useId, useRef, useState } from 'react'

import { cn } from '@/shared/lib/cn'

type DropdownMenuProps = {
  trigger: ReactNode
  triggerClassName?: string
  ariaLabel: string
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function DropdownMenu({
  trigger,
  triggerClassName,
  ariaLabel,
  children,
  align = 'right',
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function close() {
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute z-30 mt-2 min-w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  )
}

type DropdownItemProps = {
  children: ReactNode
  onClick?: () => void
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
}

export function DropdownItem({
  children,
  onClick,
  icon,
  danger = false,
  disabled = false,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 px-3.5 text-left text-sm transition',
        danger
          ? 'text-red-300 hover:bg-red-500/10'
          : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {icon ? <span className="shrink-0 opacity-80">{icon}</span> : null}
      {children}
    </button>
  )
}
