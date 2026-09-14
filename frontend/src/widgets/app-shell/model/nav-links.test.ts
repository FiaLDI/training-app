import { isTabRoute } from './nav-links'

describe('isTabRoute', () => {
  it('matches primary tab routes', () => {
    expect(isTabRoute('/')).toBe(true)
    expect(isTabRoute('/week')).toBe(true)
    expect(isTabRoute('/stats')).toBe(true)
  })

  it('matches more menu routes and nested pages', () => {
    expect(isTabRoute('/plans')).toBe(true)
    expect(isTabRoute('/plans/tpl-1')).toBe(true)
    expect(isTabRoute('/exercises')).toBe(true)
    expect(isTabRoute('/exercises/ex-1')).toBe(true)
    expect(isTabRoute('/settings')).toBe(true)
    expect(isTabRoute('/help')).toBe(true)
    expect(isTabRoute('/news')).toBe(true)
    expect(isTabRoute('/news/what-you-can-do')).toBe(true)
    expect(isTabRoute('/catalog')).toBe(true)
    expect(isTabRoute('/catalog/ppl')).toBe(true)
    expect(isTabRoute('/coach')).toBe(true)
    expect(isTabRoute('/coach/trainees/user-1')).toBe(true)
  })

  it('matches admin routes', () => {
    expect(isTabRoute('/admin/users')).toBe(true)
    expect(isTabRoute('/admin/users/user-1')).toBe(true)
    expect(isTabRoute('/admin/catalog')).toBe(true)
    expect(isTabRoute('/admin/news')).toBe(true)
  })

  it('excludes public and fullscreen session routes', () => {
    expect(isTabRoute('/login')).toBe(false)
    expect(isTabRoute('/~offline')).toBe(false)
    expect(isTabRoute('/trainings/tr-1')).toBe(false)
    expect(isTabRoute('/share/abc')).toBe(false)
  })

  it('excludes unrelated routes', () => {
    expect(isTabRoute('/unknown')).toBe(false)
  })
})
