'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarDays,
  BarChart3,
  ChevronDown,
  Dumbbell,
  Home,
  LayoutTemplate,
  LogOut,
  Package,
  MoreHorizontal,
} from 'lucide-react'

import { useSessionStore } from '@/entities/session/model/store'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

const primaryLinks = [
  { href: '/', label: 'Сегодня', icon: Home },
  { href: '/plan', label: 'Неделя', icon: CalendarDays },
  { href: '/stats', label: 'Статистика', icon: BarChart3 },
]

const moreLinks = [
  { href: '/plans', label: 'Планы', icon: LayoutTemplate },
  { href: '/exercises', label: 'Упражнения', icon: Dumbbell },
  { href: '/equipment', label: 'Инвентарь', icon: Package },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (pathname === href) return true
  return pathname.startsWith(`${href}/`)
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const mode = useSessionStore((s) => s.mode)
  const user = useSessionStore((s) => s.user)
  const switchMode = useSessionStore((s) => s.switchMode)
  const moreActive = moreLinks.some((link) => isActive(pathname, link.href))
  const [moreOpen, setMoreOpen] = useState(moreActive)

  async function onSwitchMode() {
    await switchMode()
    router.replace('/login')
  }

  return (
    <aside className="flex h-fit w-full flex-col border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 py-4 backdrop-blur md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r md:px-5 md:py-8 lg:h-screen">
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
              moreActive || moreOpen
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
            )}
          >
            <MoreHorizontal className="size-4 shrink-0 md:hidden" />
            <ChevronDown
              className={cn(
                'hidden size-4 shrink-0 transition md:block',
                moreOpen && 'rotate-180',
              )}
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
          </div>
        ) : null}
      </nav>

      <div className="mt-auto hidden border-t border-[var(--border)] pt-4 md:block">
        <p className="truncate text-xs text-[var(--muted)]">
          {mode === 'local' ? 'Локальный режим' : user?.email ?? 'Облако'}
        </p>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 w-full justify-start px-2"
          onClick={onSwitchMode}
        >
          <LogOut className="size-4" />
          Сменить режим
        </Button>
      </div>
    </aside>
  )
}
