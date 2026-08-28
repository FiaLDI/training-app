'use client'

import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Shield } from 'lucide-react'

import { isAdmin } from '@/entities/session/model/is-admin'
import { useSessionStore } from '@/entities/session/model/store'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

import { adminLinks, isActive, moreLinks, primaryLinks } from '../model/nav-links'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const switchMode = useSessionStore((s) => s.switchMode)
  const user = useSessionStore((s) => s.user)
  const mode = useSessionStore((s) => s.mode)
  const admin = mode === 'cloud' && isAdmin(user)

  const moreActive = moreLinks.some((link) => isActive(pathname, link.href))
  const adminActive = admin && pathname.startsWith('/admin')
  const [moreOpen, setMoreOpen] = useState(moreActive || Boolean(adminActive))

  async function onSwitchMode() {
    await switchMode()
    router.replace('/login')
  }

  return (
    <aside
      style={{ viewTransitionName: 'app-sidebar' } satisfies CSSProperties}
      className="flex h-fit w-full flex-col border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 py-4 backdrop-blur md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r md:px-5 md:py-8 lg:h-screen"
    >
      <div className="mb-4 flex items-start justify-between gap-3 md:mb-6 md:block">
        <Link href="/" className="block">
          <span className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--foreground)]">
            Iron<span className="text-[var(--accent)]">Log</span>
          </span>
          <span className="mt-1 hidden text-xs text-[var(--muted)] md:block">Дневник тренировок</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="shrink-0 px-2 md:hidden"
          onClick={onSwitchMode}
          title="Сменить режим"
        >
          <LogOut className="size-4" />
        </Button>
      </div>

      <nav className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-1 md:flex-col md:items-stretch md:justify-start">
          {primaryLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'inline-flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] transition md:flex-none md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm',
                  active
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              'inline-flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] transition md:mt-1 md:flex-none md:w-full md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm',
              moreActive || adminActive || moreOpen
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
            )}
          >
            <ChevronDown
              className={cn('size-4 shrink-0 transition', moreOpen && 'rotate-180')}
            />
            <span>Ещё</span>
          </button>
        </div>

        {moreOpen ? (
          <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-2 md:ml-3 md:grid-cols-1 md:border-0 md:border-l md:bg-transparent md:p-0 md:pl-2">
            {moreLinks.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition',
                    active
                      ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] md:hover:bg-[var(--surface-2)]',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              )
            })}

            {admin ? (
              <div className="col-span-2 mt-1 space-y-1 border-t border-[var(--border)] pt-2 md:col-span-1">
                <div className="flex items-center gap-2 px-3 py-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  <Shield className="size-3.5 shrink-0" />
                  Админ-панель
                </div>
                {adminLinks.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'inline-flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition',
                        active
                          ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                          : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] md:hover:bg-[var(--surface-2)]',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {label}
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>
    </aside>
  )
}
