import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CalendarDays,
  CircleHelp,
  Dumbbell,
  Home,
  LayoutTemplate,
  Settings,
  Users,
} from 'lucide-react'

export type NavLink = {
  href: string
  label: string
  icon: LucideIcon
}

export const primaryLinks: NavLink[] = [
  { href: '/', label: 'Сегодня', icon: Home },
  { href: '/week', label: 'Неделя', icon: CalendarDays },
  { href: '/stats', label: 'Статистика', icon: BarChart3 },
]

export const moreLinks: NavLink[] = [
  { href: '/plans', label: 'Планы', icon: LayoutTemplate },
  { href: '/exercises', label: 'Упражнения', icon: Dumbbell },
  { href: '/settings', label: 'Профиль', icon: Settings },
  { href: '/help', label: 'Помощь', icon: CircleHelp },
]

export const adminLinks: NavLink[] = [
  { href: '/admin/users', label: 'Пользователи', icon: Users },
]

export function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (pathname === href) return true
  return pathname.startsWith(`${href}/`)
}
