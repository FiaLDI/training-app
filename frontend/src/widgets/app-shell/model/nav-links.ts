import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CalendarDays,
  CircleHelp,
  Dumbbell,
  Home,
  LayoutTemplate,
  Library,
  Newspaper,
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
  { href: '/news', label: 'Новости', icon: Newspaper },
  { href: '/help', label: 'Помощь', icon: CircleHelp },
]

export const adminLinks: NavLink[] = [
  { href: '/admin/users', label: 'Пользователи', icon: Users },
  { href: '/admin/catalog', label: 'Каталог', icon: Library },
  { href: '/admin/news', label: 'Новости', icon: Newspaper },
]

export function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (pathname === href) return true
  return pathname.startsWith(`${href}/`)
}

const tabRoutePrefixes = [
  ...primaryLinks.map((link) => link.href),
  ...moreLinks.map((link) => link.href),
  ...adminLinks.map((link) => link.href),
]

export function isTabRoute(pathname: string) {
  if (pathname === '/login' || pathname === '/~offline') return false
  if (/^\/trainings\/[^/]+$/.test(pathname)) return false
  return tabRoutePrefixes.some((href) => isActive(pathname, href))
}
