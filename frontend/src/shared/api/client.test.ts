import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/entities/session/model/store'

import { ApiError, apiRequest } from './client'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'Error',
    json: async () => body,
  }
}

describe('apiRequest 401 handling', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Нужна авторизация' })),
    )
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: 'http://localhost/', pathname: '/' },
      writable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('keeps a local session after 401', async () => {
    const session = { state: { mode: 'local', user: null, accessToken: null } }
    localStorage.setItem('ironlog:session', JSON.stringify(session))
    useSessionStore.setState({
      mode: 'local',
      user: null,
      accessToken: null,
      hydrated: true,
    })

    await expect(apiRequest('/exercises')).rejects.toBeInstanceOf(ApiError)
    expect(useSessionStore.getState().mode).toBe('local')
    expect(localStorage.getItem('ironlog:session')).toBeTruthy()
    expect(window.location.href).toBe('http://localhost/')
  })

  it('clears a cloud session after 401', async () => {
    localStorage.setItem(
      'ironlog:session',
      JSON.stringify({
        state: { mode: 'cloud', accessToken: 'tok', user: { id: 'u1' } },
      }),
    )
    useSessionStore.setState({
      mode: 'cloud',
      user: {
        id: 'u1',
        email: 'a@b.c',
        username: 'a',
        role: 'user',
        metadata: {},
        createdAt: '',
      },
      accessToken: 'tok',
      hydrated: true,
    })

    await expect(apiRequest('/exercises')).rejects.toBeInstanceOf(ApiError)
    expect(useSessionStore.getState().mode).toBeNull()
    expect(useSessionStore.getState().accessToken).toBeNull()
    const persisted = JSON.parse(localStorage.getItem('ironlog:session') ?? '{}') as {
      state?: { mode?: string | null }
    }
    expect(persisted.state?.mode ?? null).toBeNull()
    expect(window.location.href).toBe('/login')
  })
})
