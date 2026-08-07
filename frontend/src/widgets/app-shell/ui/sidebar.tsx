'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dumbbell, Home, LayoutTemplate, History, LogOut, Package } from 'lucide-react'

import { useSessionStore } from '@/entities/session/model/store'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

const links = [
  { href: '/', label: 'Главная', icon: Home },
  { href: '/exercises', label: 'Упражнения', icon: Dumbbell },
  { href: '/equipment', label: 'Инвентарь', icon: Package },
  { href: '/templates', label: 'Шаблоны', icon: LayoutTemplate },
  { href: '/trainings', label: 'Тренировки', icon: History },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const mode = useSessionStore((s) => s.mode)
  const user = useSessionStore((s) => s.user)
  const switchMode = useSessionStore((s) => s.switchMode)

  async function onSwitchMode() {
    await switchMode()
    router.replace('/login')
  }

  return (
    <aside className="flex h-fit md:h-screen lg:h-screen w-full flex-col border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 py-4 backdrop-blur md:sticky md:top-0 md:w-60 md:border-b-0 md:border-r md:px-5 md:py-8">
      <Link href="/" className="mb-6 block">
        <span className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--foreground)]">
          Iron<span className="text-[var(--accent)]">Log</span>
        </span>
        <span className="mt-1 block text-xs text-[var(--muted)]">Workout tracker</span>
      </Link>

      <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-1 justify-between lg:justify-start">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition',
                active
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden md:block lg:block">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto absolute top-0 right-0 border-t border-[var(--border)] pt-4 md:block lg:block md:relative lg:relative">
        <p className="truncate text-xs text-[var(--muted)] hidden md:block lg:block">
          {mode === 'local' ? 'Local mode' : user?.email ?? 'Cloud'}
        </p>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 w-full justify-start px-2"
          onClick={onSwitchMode}
        >
          <LogOut className="size-4" />
          <span className="hidden md:block lg:block">Switch mode</span>
        </Button>
      </div>
    </aside>
  )
}
