'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, LogOut, MoreHorizontal, Shield } from 'lucide-react'

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

  useEffect(() => {
    if (moreActive || adminActive) setMoreOpen(true)
    else setMoreOpen(false)
  }, [pathname, moreActive, adminActive])

  async function onSwitchMode() {
    await switchMode()
    router.replace('/login')
  }

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          aria-label="Закрыть меню"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      <aside
        style={{ viewTransitionName: 'app-sidebar' } satisfies CSSProperties}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur md:sticky md:top-0 md:inset-x-auto md:bottom-auto md:flex md:h-screen md:w-60 md:flex-col md:border-t-0 md:border-r md:bg-[var(--surface)]/80 md:px-5 md:py-8"
      >
        <div className="mb-6 hidden md:block">
          <Link href="/" className="block">
            <span className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--foreground)]">
              Iron<span className="text-[var(--accent)]">Log</span>
            </span>
            <span className="mt-1 block text-xs text-[var(--muted)]">Дневник тренировок</span>
          </Link>
        </div>

        <nav className="flex items-stretch justify-between gap-0.5 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 md:flex-col md:items-stretch md:justify-start md:gap-1 md:px-0 md:pb-0 md:pt-0">
          {primaryLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'inline-flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] transition md:flex-none md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm',
                  active
                    ? 'text-[var(--accent)] md:bg-[var(--accent)]/15'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] md:hover:bg-[var(--surface-2)]',
                )}
              >
                <Icon className="size-5 shrink-0 md:size-4" strokeWidth={active ? 2.25 : 1.75} />
                <span className="truncate">{label}</span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              'inline-flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] transition md:mt-1 md:flex-none md:w-full md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm',
              moreActive || adminActive || moreOpen
                ? 'text-[var(--accent)] md:bg-[var(--accent)]/15'
                : 'text-[var(--muted)] hover:text-[var(--foreground)] md:hover:bg-[var(--surface-2)]',
            )}
          >
            <MoreHorizontal
              className="size-5 shrink-0 md:hidden"
              strokeWidth={moreOpen || moreActive || adminActive ? 2.25 : 1.75}
            />
            <ChevronDown
              className={cn('hidden size-4 shrink-0 transition md:block', moreOpen && 'rotate-180')}
            />
            <span>Ещё</span>
          </button>
        </nav>

        {moreOpen ? (
          <div className="absolute inset-x-0 bottom-full max-h-[70vh] overflow-y-auto border-t border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] md:static md:mt-1 md:ml-3 md:max-h-none md:overflow-visible md:border-0 md:border-l md:bg-transparent md:p-0 md:pl-2 md:shadow-none">
            <div className="grid grid-cols-2 gap-1 md:grid-cols-1">
              {moreLinks.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition',
                      active
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
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
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          'inline-flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition',
                          active
                            ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                            : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {label}
                      </Link>
                    )
                  })}
                </div>
              ) : null}

              <div className="col-span-2 border-t border-[var(--border)] pt-2 md:hidden">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-2 px-3 text-[var(--muted)]"
                  onClick={onSwitchMode}
                >
                  <LogOut className="size-4" />
                  Сменить режим
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  )
}
