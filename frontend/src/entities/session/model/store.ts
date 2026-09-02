'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { backfillPendingSync } from '@/features/sync-trainings/model/backfill-pending-sync'
import { requestBackgroundSync } from '@/features/sync-trainings/model/background-sync'

import { authApi, type AuthUser } from '../api/auth-api'
import {
  enterSessionScope,
  leaveSession,
  syncStorageScopeFromSession,
} from '../lib/session-boundary'

function afterEnterCloud() {
  if (typeof window === 'undefined') return
  backfillPendingSync()
  requestBackgroundSync()
}

export function onCloudSessionReady() {
  afterEnterCloud()
}

export type AppMode = 'local' | 'cloud'

type SessionState = {
  mode: AppMode | null
  user: AuthUser | null
  accessToken: string | null
  hydrated: boolean
  setHydrated: (value: boolean) => void
  continueLocal: () => Promise<void>
  setCloudSession: (user: AuthUser, accessToken: string) => Promise<void>
  register: (email: string) => Promise<{
    email: string
    created: boolean
    message: string
    loginCode?: string
  }>
  login: (code: string) => Promise<void>
  logout: () => Promise<void>
  switchMode: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      mode: null,
      user: null,
      accessToken: null,
      hydrated: false,

      setHydrated(value) {
        set({ hydrated: value })
      },

      async continueLocal() {
        await enterSessionScope('local')
        set({ mode: 'local', user: null, accessToken: null })
      },

      async setCloudSession(user, accessToken) {
        await enterSessionScope('cloud', user.id)
        set({ mode: 'cloud', user, accessToken })
        afterEnterCloud()
      },

      async register(email) {
        return authApi.register(email)
      },

      async login(code) {
        const result = await authApi.login(code)
        await enterSessionScope('cloud', result.user.id)
        set({ mode: 'cloud', user: result.user, accessToken: result.accessToken })
        afterEnterCloud()
      },

      async logout() {
        const { mode, accessToken } = get()
        if (mode === 'cloud' && accessToken) {
          try {
            await authApi.logout()
          } catch {
            // ignore logout errors
          }
        }
        leaveSession()
        set({ mode: null, user: null, accessToken: null })
      },

      async switchMode() {
        await get().logout()
      },

      async refreshUser() {
        const { mode, accessToken } = get()
        if (mode !== 'cloud' || !accessToken) return
        try {
          const user = await authApi.me()
          set({ user })
        } catch {
          // keep persisted session
        }
      },
    }),
    {
      name: 'ironlog:session',
      partialize: (state) => ({
        mode: state.mode,
        user: state.user,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncStorageScopeFromSession(state.mode, state.user?.id ?? null)
        }
      },
    },
  ),
)
