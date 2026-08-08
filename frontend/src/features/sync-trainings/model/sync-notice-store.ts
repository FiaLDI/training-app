'use client'

import { create } from 'zustand'

type SyncNoticeState = {
  message: string | null
  showBanner: boolean
  setMessage: (message: string | null) => void
  setShowBanner: (value: boolean) => void
  notifySavedLocally: () => void
  dismissBanner: () => void
}

export const useSyncNoticeStore = create<SyncNoticeState>((set) => ({
  message: null,
  showBanner: false,

  setMessage(message) {
    set({ message })
  },

  setShowBanner(showBanner) {
    set({ showBanner })
  },

  notifySavedLocally() {
    set({
      message: 'Сохранено на устройстве. Можно отправить на сервер позже.',
      showBanner: true,
    })
  },

  dismissBanner() {
    set({ showBanner: false, message: null })
  },
}))
